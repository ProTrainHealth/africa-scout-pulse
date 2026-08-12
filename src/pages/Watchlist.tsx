import { useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Star, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useWatchlist } from '@/hooks/useWatchlist';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import SectorBadge from '@/components/SectorBadge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sector } from '@/lib/types';
import { useState } from 'react';

type CompanyRow = {
  id: string;
  name: string;
  sector: string;
  scout_score: number;
  country: string;
};

const Watchlist = () => {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const { items, loading: wlLoading, removeFromWatchlist, count } = useWatchlist();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', '/watchlist');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (wlLoading || !items.length) {
      setLoadingCompanies(false);
      return;
    }
    const ids = items.map(i => i.company_id);
    supabase
      .from('companies')
      .select('id, name, sector, scout_score, country')
      .in('id', ids)
      .then(({ data }) => {
        setCompanies((data as CompanyRow[]) || []);
        setLoadingCompanies(false);
      });
  }, [items, wlLoading]);

  const orderedCompanies = useMemo(() => {
    const order = items.map(i => i.company_id);
    return [...companies].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [companies, items]);

  const handleRemove = async (companyId: string) => {
    setRemoving(companyId);
    await removeFromWatchlist(companyId);
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    setRemoving(null);
  };

  const isLoading = authLoading || subLoading || wlLoading || loadingCompanies;
  const maxSlots = isActive ? '∞' : '5';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              Watchlist
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {count}/{maxSlots} tracked
            </p>
          </div>
          {!isActive && count >= 5 && (
            <Button onClick={() => navigate('/pricing?return_to=/watchlist')}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Upgrade for Unlimited
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : orderedCompanies.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-display font-semibold">No companies tracked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Star companies from the{' '}
              <Link to="/dashboard" className="text-primary hover:underline">Dashboard</Link>{' '}
              to add them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Sector</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Scout Score</th>
                  <th className="px-4 py-3 font-medium w-20">Remove</th>
                </tr>
              </thead>
              <tbody>
                {orderedCompanies.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 font-display font-semibold">{c.name}</td>
                    <td className="px-4 py-3"><SectorBadge sector={c.sector as Sector} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.country}</td>
                    <td className="px-4 py-3"><ScoutScoreBar score={c.scout_score} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(c.id)}
                        disabled={removing === c.id}
                        aria-label={`Remove ${c.name} from watchlist`}
                        className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {removing === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Remove {c.name} from watchlist</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
