import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

export type ScoreParts = {
  governance?: number | null;
  liquidity?: number | null;
  infrastructure?: number | null;
  regulatory?: number | null;
  catalyst?: number | null;
};

const ROWS: { key: keyof ScoreParts; label: string; letter: string; weight: number }[] = [
  { key: 'governance',     label: 'Governance',            letter: 'G', weight: 25 },
  { key: 'liquidity',      label: 'Liquidity',             letter: 'L', weight: 20 },
  { key: 'infrastructure', label: 'Infrastructure Impact', letter: 'I', weight: 20 },
  { key: 'regulatory',     label: 'Regulatory Risk',       letter: 'R', weight: 20 },
  { key: 'catalyst',       label: 'Catalyst Proximity',    letter: 'C', weight: 15 },
];

const barColor = (n: number) => (n >= 80 ? 'bg-score-high' : n >= 60 ? 'bg-score-mid' : 'bg-score-low');

export default function ScoutScoreBreakdown({ parts, score }: { parts: ScoreParts; score: number }) {
  const hasAny = ROWS.some((r) => (parts[r.key] ?? 0) > 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scout Score breakdown"
        >
          <Info className="h-3 w-3" />
          GLIRC
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 glass-card" align="end">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">Scout Score</span>
          <span className="font-display text-lg font-bold">{score}</span>
        </div>
        {!hasAny ? (
          <p className="text-xs text-muted-foreground py-2">Sub-scores not available.</p>
        ) : (
          <div className="space-y-2">
            {ROWS.map((r) => {
              const v = parts[r.key] ?? 0;
              return (
                <div key={r.key} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-mono font-bold text-accent">{r.letter}</span>
                  <span className="flex-1 truncate text-muted-foreground">{r.label}</span>
                  <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${barColor(v)}`} style={{ width: `${v}%` }} />
                  </div>
                  <span className="w-7 text-right font-display font-semibold tabular-nums">{v}</span>
                  <span className="w-8 text-right text-[10px] text-muted-foreground">{r.weight}%</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 border-t border-border/50 pt-2 text-[10px] leading-snug text-muted-foreground">
          Composite weighting: G 25 · L 20 · I 20 · R 20 · C 15. Transparent by design.
        </p>
      </PopoverContent>
    </Popover>
  );
}
