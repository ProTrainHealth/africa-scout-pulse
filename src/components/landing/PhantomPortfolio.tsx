import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

type PortfolioSummary = {
  totalReturn: number;
  topPerformer: { name: string; return: number };
  worstPerformer: { name: string; return: number };
  inceptionDate: string;
};

const PhantomPortfolio = () => {
  const [summary, setSummary] = useState<PortfolioSummary | null | 'empty'>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: positions } = await supabase
        .from('phantom_portfolio')
        .select('entry_price, current_price, entry_date, weight, company_id');

      if (!positions || positions.length === 0) {
        setSummary('empty');
        return;
      }

      const companyIds = positions.map((p) => p.company_id);
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const nameMap = new Map((companies ?? []).map((c) => [c.id, c.name]));

      // Weighted portfolio return
      const totalWeight = positions.reduce((s, p) => s + Number(p.weight), 0);
      let weightedReturn = 0;
      let best = { name: '', return: -Infinity };
      let worst = { name: '', return: Infinity };
      let earliestDate = positions[0].entry_date;

      for (const p of positions) {
        const ret = ((Number(p.current_price) - Number(p.entry_price)) / Number(p.entry_price)) * 100;
        const w = Number(p.weight) / totalWeight;
        weightedReturn += ret * w;

        const name = nameMap.get(p.company_id) ?? 'Unknown';
        if (ret > best.return) best = { name, return: ret };
        if (ret < worst.return) worst = { name, return: ret };
        if (p.entry_date < earliestDate) earliestDate = p.entry_date;
      }

      setSummary({
        totalReturn: Math.round(weightedReturn * 10) / 10,
        topPerformer: { name: best.name, return: Math.round(best.return * 10) / 10 },
        worstPerformer: { name: worst.name, return: Math.round(worst.return * 10) / 10 },
        inceptionDate: earliestDate,
      });
    };
    fetch();
  }, []);

  if (summary === 'empty') return null;

  return (
    <section className="border-t border-border/50 bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <BarChart3 className="h-3 w-3" />
              Hypothetical · Zero Positions
            </div>
            <h2 className="font-display text-2xl font-bold">Phantom Portfolio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tracking what radical neutrality looks like in practice
            </p>
          </div>

          {summary === null ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Total Return */}
              <div className="glass-card rounded-xl p-5 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Return (Since {new Date(summary.inceptionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                </div>
                <div className={`mt-2 font-display text-3xl font-bold ${summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                  {summary.totalReturn >= 0 ? '+' : ''}{summary.totalReturn}%
                </div>
              </div>

              {/* Top Performer */}
              <div className="glass-card rounded-xl p-5 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Top Performer</div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="font-display text-sm font-semibold">{summary.topPerformer.name}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-400">
                  +{summary.topPerformer.return}%
                </div>
              </div>

              {/* Worst Performer */}
              <div className="glass-card rounded-xl p-5 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Worst Performer</div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-display text-sm font-semibold">{summary.worstPerformer.name}</span>
                </div>
                <div className="mt-1 text-lg font-bold text-destructive">
                  {summary.worstPerformer.return}%
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            The Phantom Portfolio is hypothetical and does not represent actual trading.
            Omni-Scout maintains zero positions in tracked companies.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PhantomPortfolio;
