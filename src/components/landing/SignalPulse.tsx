import { Radio } from 'lucide-react';

const SIGNALS = [
  'MTN GROUP — Scout Score ↑ 74',
  'DANGOTE CEMENT — Catalyst: Q2 earnings',
  'SAFARICOM — Institutional inflow detected',
  'ESKOM RENEWABLES — Capacity expansion update',
  'EQUITY BANK — Scout Score ↑ 72',
  'SONANGOL — Regime: Bear signal active',
  'ETHIOPIAN AIRLINES — Fleet expansion catalyst',
  'STANDARD BANK — Insider ownership rising',
  'CAIRO TELECOM — Neutral regime, monitoring',
  'NNPC GAS — Infrastructure funding round',
];

const SignalPulse = () => (
  <div className="overflow-hidden border-y border-border/20 bg-card/30 py-2.5">
    <div className="flex items-center gap-3 container mx-auto px-4 mb-1.5">
      <Radio className="h-3 w-3 text-primary animate-pulse-slow" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Signal Pulse</span>
    </div>
    <div className="overflow-hidden">
      <div className="ticker-track flex" style={{ width: 'max-content' }}>
        {[...SIGNALS, ...SIGNALS].map((s, i) => (
          <span
            key={i}
            className="mx-6 inline-flex shrink-0 items-center gap-1.5 font-mono text-xs whitespace-nowrap"
          >
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-primary/90">{s}</span>
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default SignalPulse;
