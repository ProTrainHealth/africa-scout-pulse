import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Row = {
  id: string;
  name: string;
  country: string | null;
  sector: string | null;
  scout_score: number | null;
  market_cap: string | null;
  institutional_flow: string | null;
};

const scoreColor = (s: number) =>
  s >= 70 ? 'text-accent' : s >= 50 ? 'text-primary' : 'text-destructive';

const Companies = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [sector, setSector] = useState<string>(params.get('sector') ?? 'all');
  const [country, setCountry] = useState<string>(params.get('country') ?? 'all');

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/companies');
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id,name,country,sector,scout_score,market_cap,institutional_flow')
        .order('scout_score', { ascending: false })
        .limit(200);
      if (cancelled) return;
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Persist filters to URL for shareable/back-nav state
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (sector !== 'all') next.set('sector', sector);
    if (country !== 'all') next.set('country', country);
    setParams(next, { replace: true });
  }, [query, sector, country, setParams]);

  const sectors = useMemo(
    () => Array.from(new Set(rows.map(r => r.sector).filter(Boolean))) as string[],
    [rows]
  );
  const countries = useMemo(
    () => Array.from(new Set(rows.map(r => r.country).filter(Boolean))) as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (sector !== 'all' && r.sector !== sector) return false;
      if (country !== 'all' && r.country !== country) return false;
      if (q && !(`${r.name} ${r.country ?? ''} ${r.sector ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, sector, country]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" /> Companies
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? 'Loading…' : `${filtered.length} of ${rows.length} tracked`}
              </p>
            </div>
          </div>
          <Link to="/watchlist" className="text-xs font-mono uppercase tracking-wider text-primary hover:underline">
            My Watchlist →
          </Link>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies, sector, country…"
              className="pl-9"
            />
          </div>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filter by sector"
          >
            <option value="all">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filter by country"
          >
            <option value="all">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(query || sector !== 'all' || country !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setQuery(''); setSector('all'); setCountry('all'); }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No companies match your filters.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Company</th>
                    <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Country</th>
                    <th className="px-4 py-2.5 font-medium hidden md:table-cell">Sector</th>
                    <th className="px-4 py-2.5 font-medium text-right">Scout Score</th>
                    <th className="px-4 py-2.5 font-medium text-right hidden lg:table-cell">Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/20 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/company/${r.id}`)}
                    >
                      <td className="px-4 py-3 font-display font-semibold">
                        <Link
                          to={`/company/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.country ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{r.sector ?? '—'}</td>
                      <td className={`px-4 py-3 text-right font-display font-bold tabular-nums ${scoreColor(r.scout_score ?? 50)}`}>
                        {r.scout_score ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className={`font-mono text-[10px] font-bold uppercase ${
                          r.institutional_flow === 'inflow' ? 'text-accent'
                          : r.institutional_flow === 'outflow' ? 'text-destructive'
                          : 'text-muted-foreground'
                        }`}>
                          {r.institutional_flow ?? 'neutral'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Companies;
