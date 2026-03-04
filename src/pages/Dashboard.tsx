import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, TrendingUp, Users, DollarSign, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Paywall from '@/components/Paywall';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SECTORS, COUNTRIES, Sector, Company } from '@/lib/types';
import SectorBadge from '@/components/SectorBadge';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import FlowIndicator from '@/components/FlowIndicator';
import WatchlistButton from '@/components/WatchlistButton';

const Dashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<Sector | 'All'>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'scoutScore' | 'name' | 'cashRunway' | 'catalystDate'>('scoutScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/dashboard');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isActive || !user) return;
    const fetchCompanies = async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) {
        console.error('Error fetching companies:', error);
        setLoading(false);
        return;
      }
      const mapped: Company[] = (data || []).map((row) => ({
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
      setLoading(false);
    };
    fetchCompanies();
  }, [isActive, user]);

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

  const summaryStats = useMemo(() => {
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
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show paywall if not subscribed
  if (!isActive) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <Paywall />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">Live Intelligence Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            50 companies critical to Africa's infrastructure future • Updated in real-time
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Users, label: 'Companies', value: summaryStats.total, color: 'text-foreground' },
            { icon: TrendingUp, label: 'Avg Scout Score', value: summaryStats.avgScore, color: 'text-primary' },
            { icon: DollarSign, label: 'Net Inflows', value: summaryStats.inflowCount, color: 'text-accent' },
            { icon: Calendar, label: 'Avg Runway (mo)', value: summaryStats.avgRunway, color: 'text-foreground' },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value as Sector | 'All')}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Countries</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Sector</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="cursor-pointer px-4 py-3 font-medium hover:text-foreground" onClick={() => toggleSort('scoutScore')}>
                  Scout Score {sortBy === 'scoutScore' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="cursor-pointer px-4 py-3 font-medium hover:text-foreground" onClick={() => toggleSort('cashRunway')}>
                  Runway {sortBy === 'cashRunway' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 font-medium">Insider %</th>
                <th className="px-4 py-3 font-medium">Flow</th>
                <th className="px-4 py-3 font-medium">Market Cap</th>
                <th className="cursor-pointer px-4 py-3 font-medium hover:text-foreground" onClick={() => toggleSort('catalystDate')}>
                  Next Catalyst {sortBy === 'catalystDate' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company, i) => (
                <tr
                  key={company.id}
                  className="border-b border-border/30 transition-colors hover:bg-secondary/30 animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <WatchlistButton companyId={company.id} />
                      <div>
                        <div className="font-display font-semibold">{company.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{company.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><SectorBadge sector={company.sector} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{company.country}</td>
                  <td className="px-4 py-3"><ScoutScoreBar score={company.scoutScore} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{company.cashRunway}mo</td>
                  <td className="px-4 py-3 text-muted-foreground">{company.insiderOwnership}%</td>
                  <td className="px-4 py-3"><FlowIndicator flow={company.institutionalFlow} /></td>
                  <td className="px-4 py-3 font-display font-medium">{company.marketCap}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-xs font-medium">{company.nextCatalyst}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(company.catalystDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No companies match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
