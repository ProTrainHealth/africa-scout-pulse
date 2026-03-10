import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

type StatData = { label: string; value: string };

const LiveStatsBar = () => {
  const [stats, setStats] = useState<StatData[] | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: companies } = await supabase
        .from('companies')
        .select('sector, country, scout_score');

      if (!companies || companies.length === 0) {
        setStats([
          { label: 'Companies Tracked', value: '0' },
          { label: 'Sectors Covered', value: '0' },
          { label: 'Countries', value: '0' },
          { label: 'Avg Scout Score', value: '—' },
        ]);
        return;
      }

      const totalCompanies = companies.length;
      const sectors = new Set(companies.map((c) => c.sector));
      const countries = new Set(companies.map((c) => c.country));
      const avgScore = Math.round(
        companies.reduce((sum, c) => sum + (c.scout_score ?? 0), 0) / totalCompanies
      );

      setStats([
        { label: 'Companies Tracked', value: String(totalCompanies) },
        { label: 'Sectors Covered', value: String(sectors.size) },
        { label: 'Countries', value: String(countries.size) },
        { label: 'Avg Scout Score', value: String(avgScore) },
      ]);
    };

    fetchStats();
  }, []);

  return (
    <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
      {stats
        ? stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))
        : [...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 text-center">
              <Skeleton className="mx-auto h-8 w-12" />
              <Skeleton className="mx-auto mt-2 h-3 w-20" />
            </div>
          ))}
    </div>
  );
};

export default LiveStatsBar;
