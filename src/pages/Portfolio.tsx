import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { withRetry } from '@/lib/retry';
import Seo from '@/components/Seo';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Position = {
  id: string;
  company_id: string;
  entry_price: number;
  current_price: number;
  entry_date: string;
  weight: number;
  companies: { name: string; sector: string; country_code: string } | null;
};

type TradeForm = {
  company_id: string;
  entry_price: string;
  weight: string;
};

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const Portfolio = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const positionsQuery = useQuery({
    queryKey: ['phantom-portfolio'],
    queryFn: async () => {
      const { data, error } = await withRetry(async () =>
        supabase
          .from('phantom_portfolio')
          .select('id, company_id, entry_price, current_price, entry_date, weight, companies(name, sector, country_code)')
          .order('entry_date', { ascending: true })
      );
      if (error) throw error;
      return (data ?? []) as unknown as Position[];
    },
  });

  const companiesQuery = useQuery({
    queryKey: ['companies-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const positions = positionsQuery.data ?? [];

  const { series, totalReturn, best, worst, totalWeight } = useMemo(() => {
    const totalWeight = positions.reduce((s, p) => s + Number(p.weight), 0) || 1;
    const ret = (p: Position) =>
      ((Number(p.current_price) - Number(p.entry_price)) / Number(p.entry_price)) * 100;

    const sorted = [...positions].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    const series: { date: string; nav: number }[] = [];
    let cumulative = 0;
    for (const p of sorted) {
      cumulative += ret(p) * (Number(p.weight) / totalWeight);
      series.push({ date: p.entry_date, nav: Math.round(cumulative * 100) / 100 });
    }

    const withRet = positions.map((p) => ({ p, r: ret(p) })).sort((a, b) => b.r - a.r);
    return {
      series,
      totalWeight,
      totalReturn: cumulative,
      best: withRet[0],
      worst: withRet[withRet.length - 1],
    };
  }, [positions]);

  const form = useForm<TradeForm>({ defaultValues: { company_id: '', entry_price: '', weight: '' } });

  const onSubmit = async (values: TradeForm) => {
    if (!user) return;
    const price = Number(values.entry_price);
    const weight = Number(values.weight);
    if (!values.company_id || !Number.isFinite(price) || price <= 0 || !Number.isFinite(weight) || weight <= 0) {
      toast({ title: 'Invalid trade', description: 'Select a company and enter a positive price and weight.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('phantom_portfolio').insert({
      company_id: values.company_id,
      entry_price: price,
      current_price: price,
      weight,
      entry_date: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      toast({ title: 'Could not record trade', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Phantom trade recorded', description: 'Position added to the hypothetical book.' });
    form.reset();
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['phantom-portfolio'] });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Seo
        title="Phantom Portfolio — Hypothetical Book"
        description="Track the hypothetical Phantom Portfolio: weighted performance over time and all active positions. Zero real positions held."
        path="/portfolio"
      />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Phantom Portfolio</h1>
          <p className="text-xs text-muted-foreground">
            Hypothetical book. Zero real positions held. Weighted returns derived from entry vs current price.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/80 backdrop-blur-xl border-primary/30">
              <DialogHeader>
                <DialogTitle className="font-display">Record phantom trade</DialogTitle>
                <DialogDescription>Adds a hypothetical position. No capital is deployed.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={form.watch('company_id')}
                    onValueChange={(v) => form.setValue('company_id', v)}
                  >
                    <SelectTrigger id="company">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {(companiesQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="entry_price">Entry price</Label>
                    <Input id="entry_price" type="number" step="0.01" min="0" {...form.register('entry_price')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (%)</Label>
                    <Input id="weight" type="number" step="0.1" min="0" {...form.register('weight')} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Recording…' : 'Record trade'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {positionsQuery.isLoading ? (
        <LoadingState label="Loading portfolio…" />
      ) : positionsQuery.isError ? (
        <ErrorState error="Portfolio data is unavailable right now." onRetry={() => { void positionsQuery.refetch(); }} />
      ) : positions.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No positions recorded. Not available.
        </div>
      ) : (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-in">
            <div className="rounded-xl border border-primary/30 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Weighted return</div>
              <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${totalReturn >= 0 ? 'text-score-high' : 'text-destructive'}`}>
                {pct(totalReturn)}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Positions</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{positions.length}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top position</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold truncate">
                <TrendingUp className="h-4 w-4 text-score-high shrink-0" />
                <span className="truncate">{best?.p.companies?.name ?? '—'}</span>
                <span className="ml-auto tabular-nums text-score-high">{best ? pct(best.r) : '—'}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Worst position</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold truncate">
                <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                <span className="truncate">{worst?.p.companies?.name ?? '—'}</span>
                <span className="ml-auto tabular-nums text-destructive">{worst ? pct(worst.r) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <section className="rounded-xl border border-primary/30 bg-card/40 p-4 backdrop-blur-sm shadow-[0_0_40px_-20px_hsl(var(--primary))] animate-fade-in">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cumulative weighted return by entry date
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <RTooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [pct(Number(v)), 'Cumulative']}
                />
                <Area type="monotone" dataKey="nav" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#navFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Positions table */}
          <section className="overflow-hidden rounded-xl border border-primary/30 bg-card/40 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active positions
              </h2>
              <span className="text-[10px] text-muted-foreground tabular-nums">Total weight {totalWeight.toFixed(1)}%</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Company</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead className="text-right">Entry date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((p) => {
                    const r = ((Number(p.current_price) - Number(p.entry_price)) / Number(p.entry_price)) * 100;
                    return (
                      <TableRow key={p.id} className="border-border/40">
                        <TableCell className="font-medium">{p.companies?.name ?? 'Not available'}</TableCell>
                        <TableCell className="text-muted-foreground">{p.companies?.sector ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{p.companies?.country_code ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(p.entry_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(p.current_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(p.weight).toFixed(1)}%</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${r >= 0 ? 'text-score-high' : 'text-destructive'}`}>
                          {pct(r)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{p.entry_date}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Portfolio;
