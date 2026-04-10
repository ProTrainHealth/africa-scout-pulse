import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Search, Filter, Calendar, TrendingUp, Users, DollarSign,
  LayoutDashboard, Star, Globe, BookOpen, Receipt, Settings, LogOut, Menu,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SECTORS, COUNTRIES, Sector, Company } from '@/lib/types';
import SectorBadge from '@/components/SectorBadge';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import FlowIndicator from '@/components/FlowIndicator';
import WatchlistButton from '@/components/WatchlistButton';
import Paywall from '@/components/Paywall';
import { Skeleton } from '@/components/ui/skeleton';
import CatalystFeed from '@/components/landing/CatalystFeed';
import PhantomPortfolio from '@/components/landing/PhantomPortfolio';
import RegimeRadar from '@/components/landing/RegimeRadar';

/* ── Sidebar nav items ── */
const SIDEBAR_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Watchlist', to: '/watchlist', icon: Star },
  { label: 'World Monitor', to: '/world-monitor', icon: Globe },
  { label: 'Resources', to: '/resources', icon: BookOpen },
  { label: 'Orders', to: '/orders', icon: Receipt },
  { label: 'Settings', to: '/settings', icon: Settings },
];

type CatalystRow = { date: string; company: string; event: string; type: string };

/* ── Mock phantom portfolio ── */
const PHANTOM = [
  { company: 'Safaricom', entry: 72, current: 81, returnPct: 12.5 },
  { company: 'MTN Group', entry: 68, current: 74, returnPct: 8.8 },
  { company: 'Equity Bank', entry: 65, current: 72, returnPct: 10.8 },
];

const DashboardSkeleton = () => (
  <div className="p-6">
    <Skeleton className="h-8 w-64 mb-2" />
    <Skeleton className="h-4 w-96 mb-6" />
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
    <Skeleton className="h-10 w-full mb-4 rounded-lg" />
    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg mb-2" />)}
  </div>
);

const Dashboard = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [catalysts, setCatalysts] = useState<CatalystRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<Sector | 'All'>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'scoutScore' | 'name' | 'cashRunway' | 'catalystDate'>('scoutScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/dashboard');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if ((!isActive && !isAdmin) || !user) return;
    const fetchData = async () => {
      const [compRes, catRes] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('catalysts').select('id, title, type, event_date, signal_type, company_id, companies(name)').order('event_date', { ascending: true }).limit(20),
      ]);
      if (!compRes.error && compRes.data) {
        const mapped: Company[] = compRes.data.map((row) => ({
          id: row.id,
          name: row.name,
          sector: row.sector as Sector,
          country: row.country,
          countryCode: row.country_code,
          cashRunway: row.cash_runway,
          insiderOwnership: Number(row.insider_ownership),
          scoutScore: row.scout_score,
          nextCatalyst: row.next_catalyst,
          catalystDate: row.catalyst_date,
          institutionalFlow: row.institutional_flow as Company['institutionalFlow'],
          marketCap: row.market_cap,
          description: row.description,
        }));
        setCompanies(mapped);
      }
      if (!catRes.error && catRes.data) {
        setCatalysts(catRes.data.map((r: any) => ({
          date: new Date(r.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          company: r.companies?.name ?? 'Unknown',
          event: r.title,
          type: r.type,
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [isActive, isAdmin, user]);

  const filtered = useMemo(() => {
    let result = [...companies];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
    }
    if (selectedSector !== 'All') result = result.filter(c => c.sector === selectedSector);
    if (selectedCountry !== 'All') result = result.filter(c => c.country === selectedCountry);
    result.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'cashRunway') return dir * (a.cashRunway - b.cashRunway);
      if (sortBy === 'catalystDate') return dir * (new Date(a.catalystDate).getTime() - new Date(b.catalystDate).getTime());
      return dir * (a.scoutScore - b.scoutScore);
    });
    return result;
  }, [search, selectedSector, selectedCountry, sortBy, sortDir, companies]);

  const stats = useMemo(() => {
    const avgScore = Math.round(filtered.reduce((s, c) => s + c.scoutScore, 0) / (filtered.length || 1));
    const inflowCount = filtered.filter(c => c.institutionalFlow === 'inflow').length;
    const avgRunway = Math.round(filtered.reduce((s, c) => s + c.cashRunway, 0) / (filtered.length || 1));
    return { avgScore, inflowCount, avgRunway, total: filtered.length };
  }, [filtered]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  if (authLoading || subLoading) {
    return <div className="min-h-screen bg-background flex"><DashboardSkeleton /></div>;
  }
  if (!isActive && !isAdmin) {
    return <div className="min-h-screen bg-background"><div className="pt-24"><Paywall /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} hidden md:flex flex-col border-r border-border/30 bg-card/40 transition-all duration-200 shrink-0`}>
        <div className="flex h-14 items-center justify-between px-3 border-b border-border/30">
          {sidebarOpen && <span className="font-display text-sm font-bold text-gradient-brand">OMNI-SCOUT</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {SIDEBAR_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                location.pathname === item.to
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/30 p-2">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-7xl">
          <h1 className="font-display text-2xl font-bold">Live Intelligence Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            50 companies critical to Africa's infrastructure future
          </p>

          {/* Summary cards */}
          <div className="mt-6 mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Users, label: 'Companies', value: stats.total },
              { icon: TrendingUp, label: 'Avg Score', value: stats.avgScore, cls: 'text-primary' },
              { icon: DollarSign, label: 'Net Inflows', value: stats.inflowCount, cls: 'text-accent' },
              { icon: Calendar, label: 'Avg Runway', value: `${stats.avgRunway}mo` },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" /> {s.label}
                </div>
                <div className={`mt-1 font-display text-2xl font-bold ${s.cls ?? 'text-foreground'}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value as Sector | 'All')}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground"
            >
              <option value="All">All Sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground"
            >
              <option value="All">All Countries</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Scout Score Leaderboard */}
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/40 bg-card/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Sector</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Country</th>
                    <th className="cursor-pointer px-4 py-3 font-medium hover:text-foreground" onClick={() => toggleSort('scoutScore')}>
                      Score {sortBy === 'scoutScore' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Flow</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Cap</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Next Catalyst</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WatchlistButton companyId={c.id} />
                          <div>
                            <div className="font-display font-semibold">{c.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{c.sector}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell"><SectorBadge sector={c.sector} /></td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.country}</td>
                      <td className="px-4 py-3"><ScoutScoreBar score={c.scoutScore} /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><FlowIndicator flow={c.institutionalFlow} /></td>
                      <td className="px-4 py-3 font-display font-medium hidden lg:table-cell">{c.marketCap}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs">{c.nextCatalyst}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">No companies match your filters.</div>
              )}
            </div>
          )}

          {/* Catalyst Calendar */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold mb-4">Catalyst Calendar</h2>
            <div className="space-y-2">
              {catalysts.map((cat) => (
                <div key={cat.date + cat.company} className="glass-card rounded-lg px-4 py-3 flex items-center gap-4">
                  <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">{cat.date}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-sm">{cat.company}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{cat.event}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">{cat.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phantom Portfolio */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold mb-1">Phantom Portfolio</h2>
            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Hypothetical only — not financial advice
            </p>
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Entry Score</th>
                    <th className="px-4 py-3 font-medium">Current</th>
                    <th className="px-4 py-3 font-medium">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {PHANTOM.map((p) => (
                    <tr key={p.company} className="border-b border-border/20">
                      <td className="px-4 py-3 font-display font-semibold">{p.company}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.entry}</td>
                      <td className="px-4 py-3 font-medium">{p.current}</td>
                      <td className="px-4 py-3">
                        <span className="text-accent font-semibold">+{p.returnPct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border/30 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Aggregate Portfolio Pulse</span>
                <span className="font-display font-bold text-primary">75.7</span>
              </div>
            </div>
          </div>

          {/* Regime Monitor Strip */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {[
              { icon: TrendingUp, label: 'Market Regime', value: 'Bull Phase', cls: 'text-accent' },
              { icon: Globe, label: 'Continent Sentiment', value: '72/100', cls: 'text-primary' },
              { icon: Calendar, label: 'Active Alerts', value: '3', cls: 'text-destructive' },
            ].map((item) => (
              <div key={item.label} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </div>
                <div className={`font-display text-xl font-bold ${item.cls}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Relocated terminal features */}
          <CatalystFeed />
          <RegimeRadar />
          <PhantomPortfolio />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2">
          {SIDEBAR_ITEMS.slice(0, 5).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-[10px] ${
                location.pathname === item.to ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
