import { Link } from 'react-router-dom';
import { Eye, BarChart3, Lock, Zap, ArrowRight, Activity, Shield } from 'lucide-react';
import heroImage from '@/assets/hero-africa.jpg';
import LiveStatsBar from '@/components/landing/LiveStatsBar';
import SignalPulse from '@/components/landing/SignalPulse';
import BoardroomSeats from '@/components/landing/BoardroomSeats';
import Seo from '@/components/Seo';

const tiers = [
  {
    name: 'Observer',
    price: 'Free',
    description: 'Deep dives, sector theses, and narrative intelligence.',
    features: [
      'Weekly deep-dive reports',
      'Sector thesis publications',
      'Public Phantom Portfolio',
      'Community access',
    ],
    icon: Eye,
    highlighted: false,
  },
  {
    name: 'Analyst',
    price: 'From $139/mo',
    description: 'Full dashboard access with real-time Scout Scores.',
    features: [
      'Everything in Observer',
      'Live company ledger',
      'Scout Score tracking',
      'Catalyst calendar',
      'Institutional flow data',
    ],
    icon: BarChart3,
    highlighted: true,
  },
  {
    name: 'Boardroom',
    price: 'From $449/mo',
    description: 'Private signal room. Limited to 50 seats.',
    features: [
      'Everything in Analyst',
      'Private signal room',
      'Private voice notes',
      'Management call summaries',
      'Monthly video boardroom',
      'Direct analyst access',
    ],
    icon: Lock,
    highlighted: false,
    limited: true,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Seo
        title="Omni-Scout Africa — Intelligence for Africa's Next 50"
        description="Scout Scores, catalyst tracking, and institutional flow data on 50 companies critical to Africa's infrastructure by 2050. Radically neutral. Zero positions."
        path="/"
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Africa intelligence map"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background" />
        </div>

        <div className="relative container mx-auto px-4 pb-20 pt-24 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Activity className="h-3.5 w-3.5" />
              Tracking Africa's Infrastructure Future
            </div>

            <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Unbiased Intelligence for{' '}
              <span className="text-gradient-brand">Africa's Next 50</span>
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              Scout Scores, catalyst tracking, and institutional flow data on 50
              companies critical to the continent's infrastructure by 2050.
              Radically neutral. Zero positions.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/auth"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start Free
              </Link>
              <a
                href="#tiers"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                See Plans
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <LiveStatsBar />
          </div>
        </div>
      </section>

      {/* Signal Pulse */}
      <SignalPulse />

      {/* Pricing */}
      <section id="tiers" className="border-t border-border/30 bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-14 max-w-lg text-center">
            <h2 className="font-display text-3xl font-bold">Choose Your Intel Level</h2>
            <p className="mt-3 text-muted-foreground">
              From narrative intelligence to the boardroom.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-6 transition-all ${
                  tier.highlighted
                    ? 'border-primary/40 bg-card glow-brand'
                    : 'border-border/40 bg-card/40'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <tier.icon className="h-5 w-5 text-primary" />
                </div>

                <h3 className="font-display text-xl font-bold">{tier.name}</h3>
                <div className="mt-2 font-display text-3xl font-bold text-primary">
                  {tier.price}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>

                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.limited && <BoardroomSeats />}

                <Link
                  to={tier.price === 'Free' ? '/auth' : '/pricing'}
                  className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {tier.price === 'Free' ? 'Start Free' : `Upgrade to ${tier.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Radical Transparency
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Omni-Scout Africa maintains zero trading positions in any tracked
              company. All Scout Scores are derived from publicly available data
              and proprietary sentiment analysis. The Phantom Portfolio is
              hypothetical and does not represent actual trading. This is not
              financial advice.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>© 2026 Omni-Scout Africa</span>
              <span className="text-border">|</span>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <span className="text-border">|</span>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
