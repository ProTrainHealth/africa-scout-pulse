import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, ShieldAlert, Activity, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import NativeWorldMap from '@/components/world-monitor/NativeWorldMap';

const CATALYSTS = [
  {
    name: 'Dangote Refinery Phase 2',
    country: 'Nigeria',
    sector: 'Energy',
    desc: 'Capacity expansion approval expected Q2 2026',
    date: 'Apr 28, 2026',
  },
  {
    name: 'EACOP Pipeline',
    country: 'Uganda/Tanzania',
    sector: 'Infrastructure',
    desc: 'First oil flow milestone delayed — new timeline Q3 2026',
    date: 'May 15, 2026',
  },
  {
    name: 'Safaricom Ethiopia',
    country: 'Kenya',
    sector: 'Telecom',
    desc: 'Subscriber base crosses 5M — ARPU expansion signal',
    date: 'May 3, 2026',
  },
  {
    name: 'KenGen Olkaria V',
    country: 'Kenya',
    sector: 'Energy',
    desc: 'Geothermal phase 2 groundbreaking confirmed',
    date: 'Jun 1, 2026',
  },
  {
    name: 'Cairo Metro Line 6',
    country: 'Egypt',
    sector: 'Infrastructure',
    desc: 'EPC contract awarded — $4.1B capex committed',
    date: 'Jun 14, 2026',
  },
];

const SANCTIONS = [
  {
    country: 'Sudan',
    status: 'ACTIVE',
    severity: 'red' as const,
    desc: 'OFAC SDN list active. Energy sector restricted.',
    updated: 'Apr 12, 2026',
  },
  {
    country: 'Ethiopia (Tigray)',
    status: 'MONITORING',
    severity: 'amber' as const,
    desc: 'Partial EU restrictions. Watch Q2 review.',
    updated: 'Apr 09, 2026',
  },
  {
    country: 'DRC (Eastern Zone)',
    status: 'ELEVATED',
    severity: 'red' as const,
    desc: 'Armed conflict overlay. Capex pause signal.',
    updated: 'Apr 15, 2026',
  },
  {
    country: 'Mali',
    status: 'ACTIVE',
    severity: 'red' as const,
    desc: 'ECOWAS/EU sanctions. Financial flows restricted.',
    updated: 'Apr 11, 2026',
  },
];

const REGIME_ROWS = [
  { name: 'USD Index', status: 'ELEVATED' },
  { name: 'EM Capital Flows', status: 'INFLOW ↑' },
  { name: 'Brent Crude', status: '$87.40' },
  { name: 'SA 10Y Yield', status: '9.2%' },
  { name: 'VIX', status: '18.4' },
];

const Dot = ({ color }: { color: string }) => (
  <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
    <circle cx="4" cy="4" r="3" fill={color} />
  </svg>
);

const WorldMonitor = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { isActive, plan, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'World Monitor — Omni-Scout Africa';
  }, []);

  const isLoading = authLoading || subLoading;
  const hasAccess = isAdmin || (isActive && (plan === 'analyst' || plan === 'boardroom'));

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
            <ul className="divide-y divide-border/30">
              {CATALYSTS.map((c) => (
                <li key={c.name} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-foreground">{c.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                        {c.country} · {c.sector}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {c.desc}
                    </p>
                  </div>
                  <div className="font-mono text-xs text-primary whitespace-nowrap pt-0.5">
                    {c.date}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — Sanctions & Regime */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <h2 className="font-display text-lg font-bold">Sanctions & Regime Watch</h2>
              </div>
              <ul className="space-y-3">
                {SANCTIONS.map((s) => {
                  const badgeClass =
                    s.severity === 'red'
                      ? 'bg-destructive/15 text-destructive border-destructive/40'
                      : 'bg-primary/15 text-primary border-primary/40';
                  return (
                    <li key={s.country} className="border-b border-border/30 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{s.country}</span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badgeClass}`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                        Updated {s.updated}
                      </div>
                    </li>
                  );
                })}
              </ul>
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
                  {REGIME_ROWS.map((r) => (
                    <tr key={r.name} className="border-b border-border/20 last:border-0">
                      <td className="py-2 text-muted-foreground">{r.name}</td>
                      <td className="py-2 text-right font-mono font-semibold text-foreground">
                        {r.status}
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
