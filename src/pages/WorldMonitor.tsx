import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, ShieldAlert, Activity, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import NativeWorldMap from '@/components/world-monitor/NativeWorldMap';
import { supabase } from '@/integrations/supabase/client';

interface CatalystItem {
  id: string;
  company_name: string;
  country_code: string;
  event_type: string;
  description: string;
  catalyst_date: string;
  sector?: string;
}

interface SanctionItem {
  country_name: string;
  country_code: string;
  risk_tag: string;
  risk_detail: string;
  updated_at: string;
}

interface RegimeRow {
  indicator: string;
  current_value: string;
  trend: string;
}

const REGIME_FALLBACK: RegimeRow[] = [
  { indicator: 'USD Index', current_value: '104.2', trend: '↑' },
  { indicator: 'EM Capital Flows', current_value: 'INFLOW', trend: '↑' },
  { indicator: 'Brent Crude', current_value: '$87.40', trend: '→' },
  { indicator: 'SA 10Y Yield', current_value: '9.2%', trend: '↑' },
  { indicator: 'VIX', current_value: '18.4', trend: '↓' },
];

const Dot = ({ color }: { color: string }) => (
  <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
    <circle cx="4" cy="4" r="3" fill={color} />
  </svg>
);

const formatDate = (raw: string) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const WorldMonitor = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { isActive, plan, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [catalysts, setCatalysts] = useState<CatalystItem[]>([]);
  const [sanctions, setSanctions] = useState<SanctionItem[]>([]);
  const [regimeData, setRegimeData] = useState<RegimeRow[]>([]);
  const [panelLoading, setPanelLoading] = useState(true);

  useEffect(() => {
    document.title = 'World Monitor — Omni-Scout Africa';
  }, []);

  const isLoading = authLoading || subLoading;
  const hasAccess = isAdmin || (isActive && (plan === 'analyst' || plan === 'boardroom'));

  useEffect(() => {
    if (!hasAccess) return;

    let cancelled = false;
    const fetchPanelData = async () => {
      const [catResult, sancResult] = await Promise.all([
        supabase
          .from('catalysts')
          .select(
            `id, title, type, notes, event_date, companies:company_id ( name, country_code, sector )`,
          )
          .order('event_date', { ascending: true })
          .limit(8),
        supabase
          .from('country_context')
          .select('country, country_code, risk_tag, regime_status, updated_at')
          .or(
            'risk_tag.ilike.%sanction%,risk_tag.ilike.%alert%,risk_tag.ilike.%restricted%,risk_tag.ilike.%elevated%',
          )
          .limit(6),
      ]);

      if (cancelled) return;

      if (!catResult.error && catResult.data) {
        setCatalysts(
          (catResult.data as any[]).map((c) => ({
            id: c.id,
            company_name: c.companies?.name ?? 'Unknown',
            country_code: c.companies?.country_code ?? '',
            event_type: c.title ?? c.type ?? 'Event',
            description: c.notes ?? '',
            catalyst_date: c.event_date ?? '',
            sector: c.companies?.sector,
          })),
        );
      } else if (catResult.error) {
        console.error('catalysts panel fetch:', catResult.error);
      }

      if (!sancResult.error && sancResult.data) {
        setSanctions(
          (sancResult.data as any[]).map((s) => ({
            country_name: s.country ?? '',
            country_code: s.country_code ?? '',
            risk_tag: s.risk_tag ?? '',
            risk_detail: s.regime_status ?? '',
            updated_at: s.updated_at ?? '',
          })),
        );
      } else if (sancResult.error) {
        console.error('sanctions panel fetch:', sancResult.error);
      }

      // Macro regime: no source table yet — keep fallback.
      setRegimeData([]);
      setPanelLoading(false);
    };

    fetchPanelData();
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-4" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 pt-32 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">World Monitor — Locked</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Macro & geopolitical overlays are available on the Analyst and Boardroom plans.
          </p>
          <Button
            onClick={() => navigate('/pricing?return_to=/world-monitor')}
            className="mt-6"
            size="lg"
          >
            Upgrade to Unlock
          </Button>
        </div>
      </div>
    );
  }

  const regimeRows = regimeData.length > 0 ? regimeData : REGIME_FALLBACK;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              World Monitor — Intelligence Map
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Live catalyst tracking, sanctions overlays, and institutional signals across Africa's infrastructure landscape.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                LIVE FEED
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                50 COMPANIES
              </span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="glass-card glow-brand rounded-2xl overflow-hidden p-4">
          <NativeWorldMap showControls={true} height={520} />

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-border/40 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <Dot color="hsl(155 55% 42%)" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">ACCUMULATE</span>
            </div>
            <div className="flex items-center gap-2">
              <Dot color="hsl(38 100% 50%)" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">HOLD</span>
            </div>
            <div className="flex items-center gap-2">
              <Dot color="hsl(0 72% 51%)" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">MONITOR</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
                <rect
                  x="1.5"
                  y="1.5"
                  width="7"
                  height="7"
                  transform="rotate(45 5 5)"
                  fill="hsl(0 72% 51% / 0.8)"
                  stroke="hsl(0 72% 51%)"
                />
              </svg>
              <span className="font-mono uppercase tracking-wider text-muted-foreground">Sanctions Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                <circle
                  cx="6"
                  cy="6"
                  r="4"
                  fill="transparent"
                  stroke="hsl(38 100% 50%)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle cx="6" cy="6" r="1.5" fill="hsl(38 100% 50%)" />
              </svg>
              <span className="font-mono uppercase tracking-wider text-muted-foreground">Active Catalyst</span>
            </div>
          </div>
        </div>

        {/* Intelligence feed */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT — Active Catalysts */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-bold">Active Catalysts</h2>
            </div>
            {panelLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : catalysts.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">
                No catalyst events found.
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {catalysts.map((c) => (
                  <li key={c.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground">{c.event_type}</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                          {c.company_name}
                          {c.country_code ? ` · ${c.country_code}` : ''}
                          {c.sector ? ` · ${c.sector}` : ''}
                        </span>
                      </div>
                      {c.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="font-mono text-xs text-primary whitespace-nowrap pt-0.5">
                      {formatDate(c.catalyst_date)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RIGHT — Sanctions & Regime */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <h2 className="font-display text-lg font-bold">Sanctions & Regime Watch</h2>
              </div>
              {panelLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : sanctions.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No active alerts.
                </div>
              ) : (
                <ul className="space-y-3">
                  {sanctions.map((s) => {
                    const tag = (s.risk_tag ?? '').toLowerCase();
                    const isRed = tag.includes('sanction') || tag.includes('restricted');
                    const isAmber = tag.includes('alert') || tag.includes('elevated');
                    const badgeClass = isRed
                      ? 'bg-destructive/15 text-destructive border-destructive/40'
                      : isAmber
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-secondary/50 text-muted-foreground border-border/40';
                    return (
                      <li key={`${s.country_name}-${s.risk_tag}`} className="border-b border-border/30 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm">{s.country_name}</span>
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badgeClass}`}
                          >
                            {s.risk_tag}
                          </span>
                        </div>
                        {s.risk_detail && (
                          <p className="mt-1 text-xs text-muted-foreground">{s.risk_detail}</p>
                        )}
                        {s.updated_at && (
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                            Updated {formatDate(s.updated_at)}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Macro Regime mini-card */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: 'hsl(155 55% 42%)' }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: 'hsl(155 55% 42%)' }}
                  />
                </span>
                <h2 className="font-display text-sm font-bold">
                  Current Regime:{' '}
                  <span style={{ color: 'hsl(155 55% 42%)' }}>RISK-ON</span>
                </h2>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {regimeRows.map((r) => (
                    <tr key={r.indicator} className="border-b border-border/20 last:border-0">
                      <td className="py-2 text-muted-foreground">{r.indicator}</td>
                      <td className="py-2 text-right font-mono font-semibold text-foreground">
                        {r.current_value} {r.trend}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMonitor;
