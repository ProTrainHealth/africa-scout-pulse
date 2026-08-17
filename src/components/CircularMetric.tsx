import * as Progress from '@radix-ui/react-progress';

interface CircularMetricProps {
  label: string;
  value?: number | null;
  hint?: string;
}

const RADIUS = 34;
const CIRC = 2 * Math.PI * RADIUS;

const toneFor = (v: number) =>
  v >= 80 ? 'hsl(var(--score-high))' : v >= 60 ? 'hsl(var(--score-mid))' : 'hsl(var(--score-low))';

const CircularMetric = ({ label, value, hint }: CircularMetricProps) => {
  const has = typeof value === 'number' && !Number.isNaN(value);
  const v = has ? Math.max(0, Math.min(100, value as number)) : 0;
  const stroke = toneFor(v);

  return (
    <Progress.Root
      value={has ? v : null}
      max={100}
      className="glass-card rounded-xl p-4 flex flex-col items-center gap-3 border border-primary/10 hover:border-primary/30 transition-colors animate-fade-in"
      aria-label={label}
    >
      <div className="relative h-[84px] w-[84px]">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={RADIUS} fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC - (CIRC * v) / 100}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1)' }}
          />
        </svg>
        <Progress.Indicator asChild>
          <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular-nums">
            {has ? v : '—'}
          </span>
        </Progress.Indicator>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</div>}
      </div>
    </Progress.Root>
  );
};

export default CircularMetric;
