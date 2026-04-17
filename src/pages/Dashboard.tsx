import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Globe, Star, BookOpen, Settings2,
  LogOut, Menu, Activity, Calendar, TrendingUp, Users, Gauge, Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Sidebar nav ── */
const SIDEBAR_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Companies', to: '/dashboard', icon: Building2 },
  { label: 'World Monitor', to: '/world-monitor', icon: Globe },
  { label: 'Watchlist', to: '/watchlist', icon: Star },
  { label: 'Resources', to: '/resources', icon: BookOpen },
  { label: 'Settings', to: '/settings', icon: Settings2 },
];

/* ── Mock company ledger ── */
type Signal = 'ACCUMULATE' | 'HOLD' | 'MONITOR';
type LedgerRow = {
  company: string;
  country: string;
  sector: string;
  score: number;
  change30d: number;
  signal: Signal;
};

const LEDGER: LedgerRow[] = [
  { company: 'Safaricom',           country: 'Kenya',        sector: 'Telecom',     score: 84, change30d: 6.2, signal: 'ACCUMULATE' },
  { company: 'Dangote Cement',      country: 'Nigeria',      sector: 'Materials',   score: 78, change30d: 3.1, signal: 'ACCUMULATE' },
  { company: 'MTN Group',           country: 'South Africa', sector: 'Telecom',     score: 74, change30d: 2.4, signal: 'ACCUMULATE' },
  { company: 'KenGen',              country: 'Kenya',        sector: 'Energy',      score: 71, change30d: 4.8, signal: 'ACCUMULATE' },
  { company: 'Société Générale Maroc', country: 'Morocco',   sector: 'Finance',     score: 69, change30d: 1.2, signal: 'HOLD' },
  { company: 'SONATEL',             country: 'Senegal',      sector: 'Telecom',     score: 67, change30d: 0.4, signal: 'HOLD' },
  { company: 'BUA Foods',           country: 'Nigeria',      sector: 'Consumer',    score: 63, change30d: -1.1, signal: 'HOLD' },
  { company: 'Transnet',            country: 'South Africa', sector: 'Logistics',   score: 56, change30d: -0.6, signal: 'HOLD' },
  { company: 'NMDC',                country: 'Egypt',        sector: 'Construction', score: 51, change30d: 2.0, signal: 'MONITOR' },
  { company: 'ESKOM',               country: 'South Africa', sector: 'Energy',      score: 47, change30d: -3.4, signal: 'MONITOR' },
];

const TOP_CATALYST = {
  company: 'Safaricom',
  type: 'Earnings',
  date: 'Apr 24, 2026',
  description: 'Q4 results expected to confirm M-PESA volume acceleration and capex normalisation across East African corridors.',
};

const REGIME_ROWS = [
  { label: 'USD Strength',         status: 'ELEVATED',     tone: 'risk' },
  { label: 'EM Capital Flows',     status: 'INFLOW',       tone: 'good' },
  { label: 'Brent Crude (90d)',    status: 'STABLE',       tone: 'neutral' },
  { label: 'Africa Sovereign CDS', status: 'COMPRESSING',  tone: 'good' },
  { label: 'JSE All-Share Trend',  status: 'BULLISH',      tone: 'good' },
] as const;

const PHANTOM = [
  { company: 'Safaricom',      entry: 4.12, current: 81, perf: 12.5 },
  { company: 'MTN Group',      entry: 11.84, current: 74, perf: 8.8 },
  { company: 'Dangote Cement', entry: 412.5, current: 78, perf: 6.4 },
  { company: 'KenGen',         entry: 2.95, current: 71, perf: 4.2 },
  { company: 'ESKOM',          entry: 18.30, current: 47, perf: -3.1 },
];

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

  // Auth gate — redirect to /auth if no session
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/dashboard');
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const kpis = useMemo(() => {
    const avg = LEDGER.reduce((s, r) => s + r.score, 0) / LEDGER.length;
    return [
      { label: 'Companies Tracked', value: '50' },
      { label: 'Avg Scout Score',   value: avg.toFixed(1) },
      { label: 'Active Catalysts',  value: '12' },
      { label: 'Regime',            value: 'RISK-ON' },
    ];
  }, []);

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
            const active = location.pathname === item.to && idx === 0; // Dashboard active
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
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
                  {k.value}
                </div>
              </div>
            ))}
          </section>

          {/* ZONE 3 — Two-column: Ledger (60%) + side stack (40%) */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT — Company Ledger */}
            <div className="lg:col-span-3 glass-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">Company Ledger</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{LEDGER.length} of 50</span>
              </div>
              <div className="overflow-x-auto">
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
                    {LEDGER.map((r) => (
                      <tr key={r.company} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
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
              </div>
            </div>

            {/* RIGHT — Top Catalyst + Regime Indicator */}
            <div className="lg:col-span-2 space-y-4">
              {/* Top Catalyst */}
              <div className="glass-card glow-brand rounded-xl p-5 border-primary/30">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-primary">
                  <Calendar className="h-3.5 w-3.5" /> Top Catalyst This Week
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl font-bold">{TOP_CATALYST.company}</h3>
                  <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                    {TOP_CATALYST.type}
                  </span>
                </div>
                <div className="mt-1 text-xs font-mono text-muted-foreground">{TOP_CATALYST.date}</div>
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                  {TOP_CATALYST.description}
                </p>
              </div>

              {/* Regime Indicator */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Regime Indicator</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {REGIME_ROWS.map((row) => (
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

          {/* ZONE 4 — Phantom Portfolio bottom banner */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">
                  Phantom Portfolio
                </h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Hypothetical Only — Not Financial Advice
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Position</th>
                    <th className="px-4 py-2.5 font-medium text-right">Entry Price</th>
                    <th className="px-4 py-2.5 font-medium text-right">Current Score</th>
                    <th className="px-4 py-2.5 font-medium text-right">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {PHANTOM.map((p) => (
                    <tr key={p.company} className="border-b border-border/20 last:border-0">
                      <td className="px-4 py-3 font-display font-semibold">{p.company}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {p.entry.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-display font-bold tabular-nums ${scoreColor(p.current)}`}>
                        {p.current}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                        p.perf > 0 ? 'text-accent' : 'text-destructive'
                      }`}>
                        {p.perf > 0 ? '▲ +' : '▼ '}{Math.abs(p.perf).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
