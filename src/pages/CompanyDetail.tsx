import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Calendar, Activity, FileText, TrendingUp, TrendingDown, Minus,
  Gavel, Landmark, Factory, Coins, Newspaper, ShieldAlert, Sparkles, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import ScoutScoreBreakdown from '@/components/ScoutScoreBreakdown';
import SectorBadge from '@/components/SectorBadge';
import WatchlistButton from '@/components/WatchlistButton';
import CircularMetric from '@/components/CircularMetric';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import type { Sector } from '@/lib/types';

type Company = {
  id: string; name: string; sector: string; country: string; country_code: string;
  scout_score: number; market_cap: string; description: string;
  next_catalyst: string; catalyst_date: string; institutional_flow: string;
  governance_score?: number; liquidity_score?: number; infrastructure_score?: number;
  regulatory_score?: number; catalyst_score?: number;
};

type Catalyst = { id: string; title: string; type: string; event_date: string; confidence: string; signal_type: string; notes: string };
type Signal = { id: string; summary: string; confidence: string; analyst_tag: string; published_at: string };
type ScorePoint = { date: string; score: number };
type Resource = { id: string; title: string; category: string; published_at: string };

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const SIGNAL_ICONS: Record<string, typeof Zap> = {
  regulatory: Gavel,
  policy: Landmark,
  operational: Factory,
  financial: Coins,
  news: Newspaper,
  risk: ShieldAlert,
  earnings: TrendingUp,
};

const signalIcon = (t?: string) => SIGNAL_ICONS[(t ?? '').toLowerCase()] ?? Sparkles;

const FlowBadge = ({ flow }: { flow: string }) => {
  const f = (flow ?? 'neutral').toLowerCase();
  const map = {
    inflow: { Icon: TrendingUp, cls: 'text-score-high border-score-high/40 bg-score-high/10', glow: '0 0 24px hsl(var(--score-high) / 0.45)', label: 'Institutional Inflow' },
    outflow: { Icon: TrendingDown, cls: 'text-score-low border-score-low/40 bg-score-low/10', glow: '0 0 24px hsl(var(--score-low) / 0.45)', label: 'Institutional Outflow' },
    neutral: { Icon: Minus, cls: 'text-muted-foreground border-border bg-secondary/40', glow: 'none', label: 'Institutional Flow Neutral' },
  } as const;
  const { Icon, cls, glow, label } = map[(f in map ? f : 'neutral') as keyof typeof map];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${cls}`}
      style={{ boxShadow: glow }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [history, setHistory] = useState<ScorePoint[]>([]);
  const [catalysts, setCatalysts] = useState<Catalyst[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cRes, hRes, catRes, sigRes, resRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).maybeSingle(),
        supabase.from('scout_score_history').select('score, recorded_at').eq('company_id', id).order('recorded_at', { ascending: true }).limit(180),
        supabase.from('catalysts').select('id,title,type,event_date,confidence,signal_type,notes').eq('company_id', id).order('event_date', { ascending: true }).limit(20),
        supabase.from('signals').select('id,summary,confidence,analyst_tag,published_at').eq('company_id', id).order('published_at', { ascending: false }).limit(10),
        supabase.from('resources').select('id,title,category,published_at').order('published_at', { ascending: false }).limit(8),
      ]);
      if (cancelled) return;
      if (!cRes.data) { setNotFound(true); setLoading(false); return; }
      setCompany(cRes.data as Company);
      const hRows = (hRes.data ?? []) as Array<{ score: number; recorded_at: string }>;
      setHistory(hRows.map(r => ({
        date: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: r.score,
      })));
      setCatalysts((catRes.data as Catalyst[]) ?? []);
      setSignals((sigRes.data as Signal[]) ?? []);
      setResources((resRes.data as Resource[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-base font-bold truncate">
              {loading ? <Skeleton className="h-5 w-40" /> : company?.name}
            </h1>
          </div>
          {company && <WatchlistButton companyId={company.id} />}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {loading || !company ? (
          <>
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </>
        ) : (
          <>
            {/* Parallax hero header */}
            <section className="relative overflow-hidden rounded-2xl border border-primary/20 glass-card">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-24 h-[320px] opacity-70"
                style={{
                  transform: `translate3d(0, ${scrollY * 0.35}px, 0) scale(1.1)`,
                  background:
                    'radial-gradient(60% 60% at 20% 20%, hsl(var(--primary) / 0.25), transparent 70%), radial-gradient(50% 50% at 85% 0%, hsl(var(--score-high) / 0.16), transparent 70%)',
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  transform: `translate3d(0, ${scrollY * 0.15}px, 0)`,
                  backgroundImage:
                    'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
              <div className="relative p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SectorBadge sector={company.sector as Sector} />
                      <span className="text-xs font-mono text-muted-foreground">{company.country}</span>
                      <span className="text-xs font-mono text-muted-foreground">·</span>
                      <span className="text-xs font-mono text-muted-foreground">{company.market_cap || 'Market cap N/A'}</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{company.name}</h2>
                    <FlowBadge flow={company.institutional_flow} />
                    {company.description && (
                      <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{company.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Scout Score</div>
                    <div className="font-display text-5xl font-bold text-primary tabular-nums glow-brand">{company.scout_score}</div>
                    <div className="flex items-center gap-3">
                      <ScoutScoreBar score={company.scout_score} />
                      <ScoutScoreBreakdown
                        score={company.scout_score}
                        parts={{
                          governance: company.governance_score,
                          liquidity: company.liquidity_score,
                          infrastructure: company.infrastructure_score,
                          regulatory: company.regulatory_score,
                          catalyst: company.catalyst_score,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Score history */}
            <section className="glass-card rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Score History</h3>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{history.length} points</span>
              </div>
              <div className="h-72 p-4">
                {history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Not available — no score snapshots recorded yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#scoreFill)"
                        activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Metric rings */}
            <section className="space-y-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Score Components</h3>
              <div className="columns-2 md:columns-4 gap-4 [column-fill:_balance]">
                {[
                  { label: 'Infrastructure', value: company.infrastructure_score },
                  { label: 'Liquidity', value: company.liquidity_score },
                  { label: 'Governance', value: company.governance_score },
                  { label: 'Catalyst', value: company.catalyst_score },
                ].map((m) => (
                  <div key={m.label} className="mb-4 break-inside-avoid">
                    <CircularMetric label={m.label} value={m.value} />
                  </div>
                ))}
              </div>
            </section>

            {/* Catalyst timeline */}
            <section className="glass-card rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Catalyst Timeline</h3>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{catalysts.length} events</span>
              </div>
              {catalysts.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No upcoming catalysts.</p>
              ) : (
                <ol className="relative p-6 pl-8">
                  <span aria-hidden className="absolute left-[34px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
                  {catalysts.map((c) => {
                    const Icon = signalIcon(c.signal_type);
                    return (
                      <li key={c.id} className="relative pl-10 pb-6 last:pb-0 animate-fade-in">
                        <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-[0_0_16px_hsl(var(--primary)/0.25)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="font-display text-sm font-semibold">{c.title}</h4>
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">{fmtDate(c.event_date)}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                          <span className="rounded bg-primary/15 text-primary px-1.5 py-0.5">{c.type}</span>
                          {c.signal_type && <span className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">{c.signal_type}</span>}
                          <span className="text-muted-foreground">conf: {c.confidence}</span>
                        </div>
                        {c.notes && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.notes}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Signals */}
            <section className="glass-card rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Recent Signals</h3>
              </div>
              <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
                {signals.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">No signals published.</p>
                ) : signals.map(s => (
                  <div key={s.id} className="p-4">
                    <p className="text-sm leading-relaxed">{s.summary}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      <span>{s.analyst_tag}</span>
                      <span>·</span>
                      <span>{fmtDate(s.published_at)}</span>
                      <span>·</span>
                      <span>conf: {s.confidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Resources */}
            <section className="glass-card rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Related Resources</h3>
              </div>
              {resources.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No resources available.</p>
              ) : (
                <ul className="divide-y divide-border/30">
                  {resources.map(r => (
                    <li key={r.id}>
                      <Link to={`/resources/${r.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                        <span className="font-display text-sm font-medium truncate">{r.title}</span>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">{r.category}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyDetail;
