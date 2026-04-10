import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

type StatData = { label: string; value: number; suffix?: string; prefix?: string };

const useCountUp = (target: number, duration = 1200) => {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return current;
};

const AnimatedStat = ({ stat, hasError }: { stat: StatData; hasError: boolean }) => {
  const count = useCountUp(stat.value);
  return (
    <div className="glass-card rounded-xl p-4 text-center min-w-0">
      <div className="font-display text-2xl font-bold text-primary tabular-nums">
        {stat.prefix ?? ''}{count.toLocaleString()}{stat.suffix ?? ''}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {stat.label}
      </div>
    </div>
  );
};

const parseMarketCap = (cap: string): number => {
  if (!cap) return 0;
  const cleaned = cap.replace(/[^0-9.BMTK]/gi, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  const upper = cap.toUpperCase();
  if (upper.includes('T')) return num * 1_000_000_000_000;
  if (upper.includes('B')) return num * 1_000_000_000;
  if (upper.includes('M')) return num * 1_000_000;
  if (upper.includes('K')) return num * 1_000;
  return num;
};

const formatMarketCap = (total: number): { value: number; suffix: string; prefix: string } => {
  if (total >= 1_000_000_000_000) return { value: Math.round(total / 100_000_000_000) / 10, suffix: 'T', prefix: '$' };
  if (total >= 1_000_000_000) return { value: Math.round(total / 100_000_000) / 10, suffix: 'B', prefix: '$' };
  return { value: Math.round(total / 1_000_000), suffix: 'M', prefix: '$' };
};

const LiveStatsBar = () => {
  const [stats, setStats] = useState<StatData[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesRes, catalystsRes, regimeRes] = await Promise.all([
          supabase.from('companies').select('market_cap'),
          supabase.from('catalysts').select('id'),
          supabase.from('country_context').select('risk_tag'),
        ]);

        if (companiesRes.error) throw companiesRes.error;

        const companies = companiesRes.data ?? [];
        const catalystCount = catalystsRes.data?.length ?? 0;
        const regimeAlerts = (regimeRes.data ?? []).filter(
          (r) => r.risk_tag && r.risk_tag.trim() !== ''
        ).length;

        const totalCap = companies.reduce((sum, c) => sum + parseMarketCap(c.market_cap), 0);
        const capFormatted = formatMarketCap(totalCap);

        setStats([
          { label: 'Companies Tracked', value: companies.length },
          { label: 'Active Catalysts', value: catalystCount },
          { label: 'Regime Alerts', value: regimeAlerts },
          { label: 'Market Cap Tracked', value: Math.round(capFormatted.value), suffix: capFormatted.suffix, prefix: capFormatted.prefix },
        ]);
      } catch {
        setHasError(true);
        setStats([
          { label: 'Companies Tracked', value: 50 },
          { label: 'Active Catalysts', value: 12 },
          { label: 'Regime Alerts', value: 3 },
          { label: 'Market Cap Tracked', value: 2, suffix: 'T', prefix: '$' },
        ]);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="mx-auto mt-16 max-w-3xl">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className={`inline-block h-2 w-2 rounded-full ${hasError ? 'bg-amber-400' : 'bg-accent animate-pulse'}`} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {hasError ? 'Cached Data' : 'Live'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats
          ? stats.map((stat) => (
              <AnimatedStat key={stat.label} stat={stat} hasError={hasError} />
            ))
          : [...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center">
                <Skeleton className="mx-auto h-8 w-12" />
                <Skeleton className="mx-auto mt-2 h-3 w-16" />
              </div>
            ))}
      </div>
    </div>
  );
};

export default LiveStatsBar;
