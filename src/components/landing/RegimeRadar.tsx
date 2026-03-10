import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

type CountryContext = {
  country: string;
  flag_emoji: string;
  regime_status: string;
  risk_tag: string;
  updated_at: string;
};

const STATUS_STYLES: Record<string, { dot: string; border: string }> = {
  stable: { dot: 'bg-accent', border: 'border-accent/30' },
  transitioning: { dot: 'bg-primary', border: 'border-primary/30' },
  elevated_risk: { dot: 'bg-destructive', border: 'border-destructive/30' },
};

const RegimeRadar = () => {
  const [countries, setCountries] = useState<CountryContext[] | null>(null);

  useEffect(() => {
    supabase
      .from('country_context')
      .select('*')
      .order('country')
      .then(({ data }) => setCountries((data as CountryContext[]) ?? []));
  }, []);

  if (countries !== null && countries.length === 0) return null;

  const lastUpdated = countries?.[0]?.updated_at;

  return (
    <section className="border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">Regime Radar</h2>
                <p className="text-[10px] text-muted-foreground">
                  Regulatory environment across tracked African markets
                </p>
              </div>
            </div>
            {lastUpdated && (
              <span className="text-[9px] text-muted-foreground">
                Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="mb-4 flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-accent" /> Stable / Pro-Investment</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> Transitioning</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Elevated Risk</span>
          </div>

          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {countries === null
              ? [...Array(15)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
              : countries.map((c) => {
                  const style = STATUS_STYLES[c.regime_status] ?? STATUS_STYLES.stable;
                  return (
                    <div
                      key={c.country}
                      className={`glass-card rounded-lg border-l-2 ${style.border} px-3 py-3`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{c.flag_emoji}</span>
                        <span className="font-display text-xs font-semibold truncate">{c.country}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        <span className="text-[10px] text-muted-foreground truncate">{c.risk_tag}</span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegimeRadar;
