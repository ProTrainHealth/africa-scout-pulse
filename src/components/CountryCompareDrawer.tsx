import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface CountryRow {
  country: string;
  country_code: string | null;
  regime_status: string;
  risk_tag: string;
  heat_intensity: number;
}

interface CompanyAgg {
  count: number;
  avg_score: number;
}

interface MacroRow {
  indicator: string;
  current_value: string;
  trend: string;
}

interface Props {
  iso2A: string | null;
  iso2B: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
}

const fetchCountry = async (iso2: string): Promise<{
  ctx: CountryRow | null;
  companies: CompanyAgg;
  macro: MacroRow[];
}> => {
  const [ctxRes, compRes] = await Promise.all([
    supabase
      .from('country_context')
      .select('country, country_code, regime_status, risk_tag, heat_intensity')
      .ilike('country_code', iso2)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('scout_score')
      .ilike('country_code', iso2),
  ]);

  const companies = compRes.data ?? [];
  const avg = companies.length
    ? companies.reduce((s, c: any) => s + (c.scout_score ?? 0), 0) / companies.length
    : 0;

  // Macro indicators are global in this schema; show top 4 as comparison context.
  const macroRes = await supabase
    .from('macro_indicators')
    .select('indicator, current_value, trend')
    .limit(4);

  return {
    ctx: (ctxRes.data as CountryRow) ?? null,
    companies: { count: companies.length, avg_score: Math.round(avg * 10) / 10 },
    macro: (macroRes.data as MacroRow[]) ?? [],
  };
};

const Column = ({ iso2, data }: { iso2: string; data: Awaited<ReturnType<typeof fetchCountry>> | null }) => {
  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const { ctx, companies, macro } = data;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {iso2}
        </div>
        <div className="font-display text-xl font-bold">{ctx?.country ?? iso2}</div>
        {ctx?.regime_status && (
          <span className="mt-1 inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase text-primary">
            {ctx.regime_status}
          </span>
        )}
      </div>

      <div className="glass-card rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Companies tracked</span>
          <span className="font-mono font-bold">{companies.count}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Avg Scout Score</span>
          <span className="font-mono font-bold text-primary">{companies.avg_score || '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Heat Intensity</span>
          <span className="font-mono font-bold text-accent">{ctx?.heat_intensity ?? 0}/100</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Risk Tag</span>
          <span className="font-mono text-destructive">{ctx?.risk_tag || '—'}</span>
        </div>
      </div>

      <div className="glass-card rounded-lg p-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Macro context
        </div>
        {macro.length === 0 ? (
          <div className="text-xs text-muted-foreground">Not available</div>
        ) : (
          <ul className="space-y-1.5">
            {macro.map((m) => (
              <li key={m.indicator} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate pr-2">{m.indicator}</span>
                <span className="font-mono">{m.current_value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const CountryCompareDrawer = ({ iso2A, iso2B, open, onOpenChange, onClear }: Props) => {
  const [dataA, setDataA] = useState<Awaited<ReturnType<typeof fetchCountry>> | null>(null);
  const [dataB, setDataB] = useState<Awaited<ReturnType<typeof fetchCountry>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataA(null);
    setDataB(null);
    if (iso2A) fetchCountry(iso2A).then((d) => !cancelled && setDataA(d));
    if (iso2B) fetchCountry(iso2B).then((d) => !cancelled && setDataB(d));
    return () => { cancelled = true; };
  }, [iso2A, iso2B]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Country comparison
          </SheetTitle>
          <SheetDescription>
            Side-by-side macro, regime and coverage data.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {iso2A ? <Column iso2={iso2A} data={dataA} /> : (
            <div className="text-xs text-muted-foreground italic">
              Select a country on the map to compare.
            </div>
          )}
          {iso2B ? <Column iso2={iso2B} data={dataB} /> : (
            <div className="text-xs text-muted-foreground italic">
              Click a second country on the map.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="mr-1 h-3 w-3" /> Clear selections
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CountryCompareDrawer;
