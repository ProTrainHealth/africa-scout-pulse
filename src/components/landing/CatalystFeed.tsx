import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import SectorBadge from '@/components/SectorBadge';
import type { Sector } from '@/lib/types';

type CatalystEntry = {
  id: string;
  title: string;
  type: string;
  event_date: string;
  confidence: string;
  company: { id: string; name: string; country: string; sector: string };
};

const TYPE_COLORS: Record<string, string> = {
  earnings: 'bg-blue-500/15 text-blue-400',
  contract: 'bg-emerald-500/15 text-emerald-400',
  regulatory: 'bg-amber-500/15 text-amber-400',
  infrastructure: 'bg-primary/15 text-primary',
  policy: 'bg-purple-500/15 text-purple-400',
  financing: 'bg-cyan-500/15 text-cyan-400',
};

const CatalystFeed = () => {
  const { user, isAdmin } = useAuth();
  const { plan } = useSubscription();
  const [catalysts, setCatalysts] = useState<CatalystEntry[] | null>(null);

  const canSeeDetails = isAdmin || plan === 'analyst' || plan === 'boardroom';

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('catalysts')
        .select('id, title, type, event_date, confidence, company_id')
        .order('event_date', { ascending: false })
        .limit(5);

      if (!data || data.length === 0) {
        setCatalysts([]);
        return;
      }

      const companyIds = [...new Set(data.map((c) => c.company_id))];
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, country, sector')
        .in('id', companyIds);

      const companyMap = new Map((companies ?? []).map((c) => [c.id, c]));

      setCatalysts(
        data.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          event_date: c.event_date,
          confidence: c.confidence,
          company: companyMap.get(c.company_id) ?? { id: c.company_id, name: 'Unknown', country: '', sector: '' },
        }))
      );
    };
    fetch();
  }, []);

  if (catalysts !== null && catalysts.length === 0) return null;

  return (
    <section className="border-t border-border/50 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Zap className="h-3 w-3" />
              Live Intel
            </div>
            <h2 className="font-display text-2xl font-bold">Catalyst Feed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upcoming events shaping Africa's infrastructure landscape
            </p>
          </div>
          <Link
            to="/dashboard"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Full Calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {catalysts === null
            ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : catalysts.map((c, i) => (
                <div
                  key={c.id}
                  className="glass-card relative flex flex-col gap-3 rounded-xl p-4 animate-fade-in sm:flex-row sm:items-center sm:justify-between"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Left: company + type */}
                  <div className="flex items-start gap-3 sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      {new Date(c.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold truncate">
                          {c.company.name}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_COLORS[c.type] ?? 'bg-muted text-muted-foreground'}`}>
                          {c.type}
                        </span>
                      </div>
                      {canSeeDetails ? (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">
                          {c.title}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground blur-sm select-none">
                          {c.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: country + confidence */}
                  <div className="flex items-center gap-3">
                    {c.company.sector && (
                      <SectorBadge sector={c.company.sector as Sector} />
                    )}
                    <span className="text-xs text-muted-foreground">{c.company.country}</span>
                  </div>

                  {/* Lock overlay for non-entitled */}
                  {!canSeeDetails && (
                    <div className="absolute inset-0 flex items-center justify-end rounded-xl bg-background/60 backdrop-blur-[1px] pr-4">
                      <Link
                        to="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Lock className="h-3 w-3" />
                        Unlock with Analyst
                      </Link>
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

export default CatalystFeed;
