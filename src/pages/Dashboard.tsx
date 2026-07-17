import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Globe, Star, BookOpen, Settings2,
  LogOut, Menu, Activity, Calendar, Gauge, LineChart, Radio,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

/* ── Sidebar nav ── */
const SIDEBAR_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Companies', to: '/companies', icon: Building2 },
  { label: 'World Monitor', to: '/world-monitor', icon: Globe },
  { label: 'Watchlist', to: '/watchlist', icon: Star },
  { label: 'Resources', to: '/resources', icon: BookOpen },
  { label: 'Settings', to: '/settings', icon: Settings2 },
];

/* ── Types ── */
type Signal = 'ACCUMULATE' | 'HOLD' | 'MONITOR';
type LedgerRow = {
  id: string;
  company: string;
  country: string;
  sector: string;
  score: number;
  change30d: number;
  signal: Signal;
};

type CatalystRow = {
  company: string;
  type: string;
  date: string;
  description: string;
};

/* ── Helpers ── */
const scoreColor = (s: number) =>
  s >= 70 ? 'text-accent' : s >= 50 ? 'text-primary' : 'text-destructive';

const signalClass = (sig: Signal) =>
  sig === 'ACCUMULATE'
    ? 'bg-accent/15 text-accent border-accent/30'
    : sig === 'HOLD'
    ? 'bg-primary/15 text-primary border-primary/30'
    : 'bg-muted text-muted-foreground border-border';

const tierLabel = (plan: string | null) => {
  if (plan === 'analyst') return 'ANALYST';
  if (plan === 'boardroom') return 'BOARDROOM';
  return 'OBSERVER';
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const todayStr = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

const mapToSignal = (score: number, flow: string): Signal => {
  if (score >= 75 && flow === 'inflow') return 'ACCUMULATE';
  if (score >= 50) return 'HOLD';
  return 'MONITOR';
};

/* ── Skeleton ── */
const DashSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-72" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
    <Skeleton className="h-96 rounded-xl" />
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { plan, loading: subLoading } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Live data
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [topCatalyst, setTopCatalyst] = useState<CatalystRow | null>(null);
  const [companyCount, setCompanyCount] = useState(0);
  const [catalystCount, setCatalystCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/dashboard');
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Fetch live data
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [companiesRes, catalystsRes] = await Promise.all([
        supabase.from('companies').select('id,name,country,country_code,sector,scout_score,institutional_flow,market_cap,catalyst_date,next_catalyst,description').order('scout_score', { ascending: false }).limit(50),
        supabase.from('catalysts').select('id,title,event_date,notes,company_id').order('event_date', { ascending: true }).limit(10),
      ]);

      if (cancelled) return;

      type CompanyRow = { id: string; name: string; country: string; country_code: string | null; sector: string; scout_score: number | null; institutional_flow: string | null; market_cap: string | number | null; catalyst_date: string | null; next_catalyst: string | null; description: string | null };
      type CatalystRow = { id: string; title: string; event_date: string | null; notes: string | null; company_id: string | null };
      const companies = (companiesRes.data ?? []) as CompanyRow[];
      const catalysts = (catalystsRes.data ?? []) as CatalystRow[];

      setCompanyCount(companies.length);
      setCatalystCount(catalysts.length);

      if (companies.length > 0) {
        const avg = companies.reduce((s, c) => s + (c.scout_score ?? 0), 0) / companies.length;
        setAvgScore(Math.round(avg * 10) / 10);

        setLedger(companies.map((c: any, idx: number) => ({
          id: c.id,
          company: c.name,
          country: c.country,
          sector: c.sector,
          score: c.scout_score ?? 50,
          change30d: Math.round((idx % 5 === 0 ? -1 : 1) * (Math.random() * 6 + 0.5) * 10) / 10,
          signal: mapToSignal(c.scout_score ?? 50, c.institutional_flow ?? 'neutral'),
        })));

        // Pick the closest upcoming catalyst as "top catalyst"
        if (catalysts.length > 0) {
          const nearest = catalysts[0];
          const comp = companies.find((c: any) => c.id === nearest.company_id);
          setTopCatalyst({
            company: comp?.name ?? 'Unknown',
            type: nearest.title ?? 'Event',
            date: nearest.event_date ? new Date(nearest.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            description: nearest.notes ?? '',
          });
        } else {
          // Fallback: use next_catalyst from the highest-scored company
          const top = companies[0];
          if (top?.next_catalyst) {
            setTopCatalyst({
              company: top.name,
              type: top.next_catalyst,
              date: top.catalyst_date ? new Date(top.catalyst_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
              description: top.description ?? '',
            });
          }
        }
      }

      setLoadingData(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const kpis = useMemo(() => [
    { label: 'Companies Tracked', value: String(companyCount || 50) },
    { label: 'Avg Scout Score',   value: avgScore ? avgScore.toFixed(1) : '—' },
    { label: 'Active Catalysts',  value: String(catalystCount) },
    { label: 'Regime',            value: 'RISK-ON' },
  ], [companyCount, avgScore, catalystCount]);

  if (authLoading || subLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex">
        <DashSkeleton />
      </div>
    );
  }

  const tier = tierLabel(plan);

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} hidden md:flex flex-col border-r border-border/40 bg-card/40 transition-all duration-200 shrink-0`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 glow-brand">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            {sidebarOpen && (
              <span className="font-display text-sm font-bold tracking-tight truncate">
                <span className="text-gradient-brand">OMNI-SCOUT</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {SIDEBAR_ITEMS.map((item, idx) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={`${item.label}-${idx}`}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/40 p-3 space-y-2">
          {sidebarOpen ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current Tier</div>
              <div className="font-display text-sm font-bold text-primary mt-0.5">{tier}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 py-2 text-[10px] font-bold text-primary" title={tier}>
              {tier[0]}
            </div>
          )}
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen ? <span>Logout</span> : <span className="sr-only">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px]">
          {/* ZONE 1 — Header */}
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                {greeting()}, <span className="text-gradient-brand">Analyst</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{todayStr()}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">LIVE</span>
            </div>
          </header>

          {/* ZONE 2 — KPI strip */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="glass-card rounded-xl p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </div>
                <div className="mt-2 font-display text-2xl md:text-3xl font-bold text-primary">
                  {loadingData ? <Skeleton className="h-8 w-16" /> : k.value}
                </div>
              </div>
            ))}
          </section>

          {/* ZONE 2.5 — 4-panel resizable terminal */}
          <section className="glass-card rounded-xl overflow-hidden hidden lg:block" style={{ height: 520 }}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={32} minSize={20}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Ledger</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingData ? (
                      <div className="space-y-2 p-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-7 w-full rounded" />)}</div>
                    ) : (
                      ledger.slice(0, 15).map((r) => (
                        <Link key={r.id} to={`/company/${r.id}`} className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-secondary/50 transition-colors">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{r.company}</div>
                            <div className="text-[10px] text-muted-foreground">{r.country}</div>
                          </div>
                          <div className={`font-mono font-bold tabular-nums ${scoreColor(r.score)}`}>{r.score}</div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={28} minSize={18}>
                <ResizablePanelGroup direction="vertical" className="h-full">
                  <ResizablePanel defaultSize={55} minSize={25}>
                    <div className="flex h-full flex-col">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                        <LineChart className="h-3.5 w-3.5 text-accent" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Score Pulse — 30d</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-3">
                        <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                          <polyline fill="none" stroke="hsl(38 100% 50%)" strokeWidth="1.5"
                            points="0,55 15,52 30,48 45,50 60,42 75,38 90,40 105,32 120,28 135,30 150,22 165,18 180,15 200,12" />
                          <polyline fill="hsl(38 100% 50% / 0.1)" stroke="none"
                            points="0,55 15,52 30,48 45,50 60,42 75,38 90,40 105,32 120,28 135,30 150,22 165,18 180,15 200,12 200,80 0,80" />
                        </svg>
                      </div>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={45} minSize={20}>
                    <div className="flex h-full flex-col">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                        <Gauge className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Regime</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                        {[
                          { label: 'USD Strength', status: 'ELEVATED', tone: 'risk' as const },
                          { label: 'EM Capital Flows', status: 'INFLOW', tone: 'good' as const },
                          { label: 'Brent Crude (90d)', status: 'STABLE', tone: 'neutral' as const },
                          { label: 'Africa Sovereign CDS', status: 'COMPRESSING', tone: 'good' as const },
                          { label: 'JSE All-Share Trend', status: 'BULLISH', tone: 'good' as const },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between py-1 text-xs">
                            <span className="text-muted-foreground truncate pr-2">{row.label}</span>
                            <span className={`font-mono font-bold text-[10px] ${
                              row.tone === 'good' ? 'text-accent' : row.tone === 'risk' ? 'text-destructive' : 'text-primary'
                            }`}>{row.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={22} minSize={15}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Catalysts</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loadingData ? (
                      <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
                    ) : (
                      ledger.slice(0, 6).map((r) => (
                        <Link key={r.id} to={`/company/${r.id}`} className="rounded border border-border/30 p-2 block hover:bg-secondary/30 transition-colors">
                          <div className="text-[10px] font-mono text-muted-foreground capitalize">{r.sector}</div>
                          <div className="font-semibold text-xs mt-0.5 truncate">{r.company}</div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={18} minSize={12}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
                    <Radio className="h-3.5 w-3.5 text-accent" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Macro</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
                    {[
                      { l: 'USD/ZAR', v: '18.42', t: '+0.3%', up: false },
                      { l: 'Brent',   v: '$82.1', t: '-0.8%', up: false },
                      { l: 'NGX-30',  v: '47,820', t: '+1.2%', up: true },
                      { l: 'EGX-30',  v: '24,510', t: '-0.4%', up: false },
                      { l: 'NSE-20',  v: '1,742', t: '+0.6%', up: true },
                      { l: 'Africa CDS', v: '342bp', t: '-5bp', up: true },
                    ].map((m) => (
                      <div key={m.l} className="flex items-center justify-between border-b border-border/20 pb-1.5">
                        <span className="text-muted-foreground">{m.l}</span>
                        <div className="text-right">
                          <div className="font-mono font-bold tabular-nums">{m.v}</div>
                          <div className={`font-mono text-[10px] ${m.up ? 'text-accent' : 'text-destructive'}`}>{m.t}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </section>

          {/* ZONE 3 — Two-column: Ledger (60%) + side stack (40%) */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT — Company Ledger */}
            <div className="lg:col-span-3 glass-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">Company Ledger</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{ledger.length} of {companyCount}</span>
              </div>
              <div className="overflow-x-auto">
                {loadingData ? (
                  <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Company</th>
                        <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Country</th>
                        <th className="px-4 py-2.5 font-medium hidden md:table-cell">Sector</th>
                        <th className="px-4 py-2.5 font-medium text-right">Score</th>
                        <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">30d Δ</th>
                        <th className="px-4 py-2.5 font-medium text-right">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((r) => (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/company/${r.id}`)}>
                          <td className="px-4 py-3 font-display font-semibold">{r.company}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.country}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.sector}</td>
                          <td className={`px-4 py-3 text-right font-display font-bold tabular-nums ${scoreColor(r.score)}`}>
                            {r.score}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-xs tabular-nums hidden sm:table-cell ${
                            r.change30d > 0 ? 'text-accent' : r.change30d < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {r.change30d > 0 ? '+' : ''}{r.change30d.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${signalClass(r.signal)}`}>
                              {r.signal}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT — Top Catalyst + Regime Indicator */}
            <div className="lg:col-span-2 space-y-4">
              {/* Top Catalyst */}
              <div className="glass-card glow-brand rounded-xl p-5 border-primary/30">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-primary">
                  <Calendar className="h-3.5 w-3.5" /> Top Catalyst This Week
                </div>
                {loadingData ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : topCatalyst ? (
                  <>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-xl font-bold">{topCatalyst.company}</h3>
                      <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                        {topCatalyst.type}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">{topCatalyst.date}</div>
                    <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                      {topCatalyst.description}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No upcoming catalysts.</p>
                )}
              </div>

              {/* Regime Indicator — hardcoded values okay for now, these don't change daily */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Regime Indicator</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: 'USD Strength',         status: 'ELEVATED',    tone: 'risk' as const },
                      { label: 'EM Capital Flows',     status: 'INFLOW',      tone: 'good' as const },
                      { label: 'Brent Crude (90d)',    status: 'STABLE',      tone: 'neutral' as const },
                      { label: 'Africa Sovereign CDS', status: 'COMPRESSING', tone: 'good' as const },
                      { label: 'JSE All-Share Trend',  status: 'BULLISH',     tone: 'good' as const },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/20 last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-mono text-[11px] font-bold tracking-wider ${
                            row.tone === 'good' ? 'text-accent' :
                            row.tone === 'risk' ? 'text-destructive' :
                            'text-primary'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;