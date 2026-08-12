import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Seo from '@/components/Seo';

const ROWS = [
  { letter: 'G', label: 'Governance',            weight: 25, what: 'Board independence, audit quality, ownership concentration, related-party risk.' },
  { letter: 'L', label: 'Liquidity',             weight: 20, what: 'Free float, average daily turnover, bid-ask spread, listing depth.' },
  { letter: 'I', label: 'Infrastructure Impact', weight: 20, what: 'Tangible footprint and counted economic uplift on roads, power, ports, telecom.' },
  { letter: 'R', label: 'Regulatory Risk',       weight: 20, what: 'Sanction exposure, licence renewals, tariff/tax regime stability.' },
  { letter: 'C', label: 'Catalyst Proximity',    weight: 15, what: 'Days to next earnings, ratings action, project milestone or policy decision.' },
];

const Transparency = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Scout Score Methodology — Transparent by Design | Omni-Scout"
        description="See exactly how every Omni-Scout Africa Scout Score is built: Governance, Liquidity, Infrastructure, Regulatory, and Catalyst weights — fully disclosed."
        path="/transparency"
      />
      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="mt-4 mb-8 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Methodology
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">
            Scout Score — <span className="text-gradient-brand">Transparent by design</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Every Omni-Scout company carries a 0-100 composite. Unlike opaque sell-side ratings,
            ours is decomposed into five sub-components with fixed weights. You always know what's
            inside the number.
          </p>
        </header>

        <section className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 w-10">Code</th>
                <th className="px-4 py-3">Sub-component</th>
                <th className="px-4 py-3">What it captures</th>
                <th className="px-4 py-3 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.letter} className="border-b border-border/20 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-accent">{r.letter}</td>
                  <td className="px-4 py-3 font-display font-semibold">{r.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.what}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{r.weight}%</td>
                </tr>
              ))}
              <tr className="bg-secondary/30">
                <td className="px-4 py-3 font-mono font-bold text-primary">Σ</td>
                <td className="px-4 py-3 font-display font-bold">Composite</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <code className="font-mono text-xs">0.25·G + 0.20·L + 0.20·I + 0.20·R + 0.15·C</code>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">100%</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-display font-bold">No black box</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every score updates nightly. Subscribers can hover the GLIRC chip on any company
              card to see the five sub-scores. Boardroom tier unlocks the full historical track.
            </p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-display font-bold">No trading positions</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Omni-Scout publishes a Phantom Portfolio to demonstrate signal quality. We hold zero
              real positions in any covered name. Radical neutrality is enforced editorially.
            </p>
          </div>
        </section>

        <p className="mt-10 text-[11px] font-mono uppercase tracking-wider text-muted-foreground text-center">
          Not financial advice — intelligence only.
        </p>
      </main>
    </div>
  );
};

export default Transparency;
