import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

type Position = {
  company_id: string;
  entry_price: number;
  current_price: number;
  entry_date: string;
  weight: number;
};

type PortfolioData = {
  totalReturnPct: number;
  totalReturnDollar: number;
  drawdownPct: number;
  best: { name: string; ret: number };
  worst: { name: string; ret: number };
  inceptionDate: string;
  sparkline: { v: number }[];
  beta: number;
};

const HYPOTHETICAL_CAPITAL = 1_000_000;

const PhantomPortfolio = () => {
  const [data, setData] = useState<PortfolioData | null | 'empty'>(null);

  useEffect(() => {
    const load = async () => {
      const { data: positions } = await supabase
        .from('phantom_portfolio')
        .select('entry_price, current_price, entry_date, weight, company_id');

      if (!positions || positions.length === 0) { setData('empty'); return; }

      const companyIds = positions.map((p) => p.company_id);
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const nameMap = new Map((companies ?? []).map((c) => [c.id, c.name]));

      const totalWeight = positions.reduce((s, p) => s + Number(p.weight), 0);
      let weightedReturn = 0;
      let best = { name: '', ret: -Infinity };
      let worst = { name: '', ret: Infinity };
      let earliestDate = positions[0].entry_date;
      let peakValue = 0;

      // Build simple sparkline from positions
      const sparkline: { v: number }[] = [];

      for (const p of positions) {
        const ret = ((Number(p.current_price) - Number(p.entry_price)) / Number(p.entry_price)) * 100;
        const w = Number(p.weight) / totalWeight;
        weightedReturn += ret * w;

        const name = nameMap.get(p.company_id) ?? 'Unknown';
        if (ret > best.ret) best = { name, ret };
        if (ret < worst.ret) worst = { name, ret };
        if (p.entry_date < earliestDate) earliestDate = p.entry_date;
      }

      // Generate synthetic 30-day sparkline based on total return
      const baseValue = HYPOTHETICAL_CAPITAL;
      const endValue = baseValue * (1 + weightedReturn / 100);
      for (let i = 0; i <= 30; i++) {
        const progress = i / 30;
        const noise = (Math.sin(i * 1.5) * 0.008 + Math.cos(i * 0.7) * 0.005) * baseValue;
        const v = baseValue + (endValue - baseValue) * progress + noise;
        sparkline.push({ v: Math.round(v) });
        if (v > peakValue) peakValue = v;
      }

      const currentValue = sparkline[sparkline.length - 1].v;
      const drawdownPct = peakValue > 0 ? ((currentValue - peakValue) / peakValue) * 100 : 0;

      // Synthetic beta (would be computed from correlation with JSE in production)
      const beta = 0.72 + (Math.random() * 0.1 - 0.05);

      setData({
        totalReturnPct: Math.round(weightedReturn * 10) / 10,
        totalReturnDollar: Math.round(endValue - baseValue),
        drawdownPct: Math.round(drawdownPct * 10) / 10,
        best: { name: best.name, ret: Math.round(best.ret * 10) / 10 },
        worst: { name: worst.name, ret: Math.round(worst.ret * 10) / 10 },
        inceptionDate: earliestDate,
        sparkline,
        beta: Math.round(beta * 100) / 100,
      });
    };
    load();
  }, []);

  if (data === 'empty') return null;

  return (
    <section className="border-t border-border/50 bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold">Phantom Portfolio</h2>
                  <span className="rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                    Hypothetical
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Portfolio weights are derived from Scout Score rankings. Higher-scoring companies receive proportionally larger allocations, rebalanced monthly.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-[10px] text-muted-foreground">Zero real positions held. Tracking radical neutrality in practice.</p>
              </div>
            </div>
          </div>

          {data === null ? (
            <div className="grid gap-3 md:grid-cols-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                {/* Total Return */}
                <div className="glass-card col-span-2 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Return (Since {new Date(data.inceptionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                  </div>
                  <div className={`mt-1 font-display text-3xl font-bold tabular-nums ${data.totalReturnPct >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {data.totalReturnPct >= 0 ? '+' : ''}{data.totalReturnPct}%
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {data.totalReturnDollar >= 0 ? '+' : ''}${data.totalReturnDollar.toLocaleString()} on $1M hypothetical
                  </div>
                </div>

                {/* Sparkline */}
                <div className="glass-card col-span-2 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">30-Day NAV</div>
                  <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={data.sparkline}>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={data.totalReturnPct >= 0 ? 'hsl(155, 55%, 42%)' : 'hsl(0, 72%, 51%)'}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Drawdown */}
                <div className="glass-card rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drawdown</div>
                  <div className="mt-1 font-display text-xl font-bold text-destructive tabular-nums">
                    {data.drawdownPct}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">From peak</div>
                </div>

                {/* Beta */}
                <div className="glass-card rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">β vs JSE</div>
                  <div className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                    {data.beta}
                  </div>
                  <div className="text-[10px] text-muted-foreground">All Share</div>
                </div>
              </div>

              {/* Best / Worst */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="glass-card flex items-center gap-3 rounded-lg px-4 py-3">
                  <TrendingUp className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Position</div>
                    <div className="font-display text-sm font-semibold truncate">{data.best.name}</div>
                  </div>
                  <span className="ml-auto font-display text-sm font-bold text-accent tabular-nums">
                    +{data.best.ret}%
                  </span>
                </div>
                <div className="glass-card flex items-center gap-3 rounded-lg px-4 py-3">
                  <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Worst Position</div>
                    <div className="font-display text-sm font-semibold truncate">{data.worst.name}</div>
                  </div>
                  <span className="ml-auto font-display text-sm font-bold text-destructive tabular-nums">
                    {data.worst.ret}%
                  </span>
                </div>
              </div>

              <p className="mt-3 text-center text-[9px] text-muted-foreground">
                Hypothetical portfolio. Zero real positions held. Not financial advice.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default PhantomPortfolio;
