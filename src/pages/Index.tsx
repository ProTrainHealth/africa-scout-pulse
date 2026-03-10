import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Shield, Eye, Zap, TrendingUp, ArrowRight, Activity, Lock } from 'lucide-react';
import heroImage from '@/assets/hero-africa.jpg';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import ScoutScoreBar from '@/components/ScoutScoreBar';
import SectorBadge from '@/components/SectorBadge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sector } from '@/lib/types';
import LiveStatsBar from '@/components/landing/LiveStatsBar';
import CatalystFeed from '@/components/landing/CatalystFeed';
import PhantomPortfolio from '@/components/landing/PhantomPortfolio';
import BoardroomSeats from '@/components/landing/BoardroomSeats';

type TopCompany = {
  id: string;
  name: string;
  country: string;
  sector: string;
  scout_score: number;
};


const tiers = [
  {
    name: 'Observer',
    price: 'Free',
    description: 'Deep dives, sector theses, and narrative intelligence.',
    features: ['Weekly deep-dive reports', 'Sector thesis publications', 'Public Phantom Portfolio', 'Community access'],
    icon: Eye,
    highlighted: false,
  },
  {
    name: 'Analyst',
    price: 'From $139/mo',
    description: 'Full dashboard access with real-time Scout Scores.',
    features: ['Everything in Observer', 'Live company ledger', 'Scout Score tracking', 'Catalyst calendar', 'Institutional flow data'],
    icon: BarChart3,
    highlighted: true,
  },
  {
    name: 'Boardroom',
    price: 'From $449/mo',
    description: 'Private signal room. Limited to 50 seats.',
    features: ['Everything in Analyst', 'Private signal room', 'Private voice notes', 'Management call summaries', 'Monthly video boardroom', 'Direct analyst access'],
    icon: Lock,
    highlighted: false,
    limited: true,
  },
];

const Index = () => {
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, country, sector, scout_score')
      .order('scout_score', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTopCompanies((data as TopCompany[]) || []);
        setLoadingTop(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Africa intelligence map" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pb-20 pt-24 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Activity className="h-3.5 w-3.5" />
              Tracking Africa's Infrastructure Future
            </div>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Unbiased Intelligence for{' '}
              <span className="text-gradient-brand">Africa's Next 50</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              Scout Scores, catalyst tracking, and institutional flow data on 50 companies
              critical to the continent's infrastructure by 2050. Radically neutral. Zero positions.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <BarChart3 className="h-4 w-4" />
                View Live Ledger
              </Link>
              <a
                href="#tiers"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                See Plans
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <LiveStatsBar />
        </div>
      </section>

      {/* Top Movers Preview */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Top Scout Scores</h2>
              <p className="mt-1 text-sm text-muted-foreground">Highest-rated companies by our proprietary metric</p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all 50 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {loadingTop
              ? [...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              : topCompanies.map((company, i) => (
                  <div key={company.id} className="glass-card rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="mb-3 flex items-start justify-between">
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      <ScoutScoreBar score={company.scout_score} />
                    </div>
                    <h3 className="font-display text-sm font-semibold leading-tight">{company.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{company.country}</p>
                    <div className="mt-3">
                      <SectorBadge sector={company.sector as Sector} />
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Catalyst Feed */}
      <CatalystFeed />

      {/* Value Props */}
      <section className="border-t border-border/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="font-display text-3xl font-bold">Why Omni-Scout?</h2>
            <p className="mt-3 text-muted-foreground">
              The continent's infrastructure future deserves intelligence without bias.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { icon: Shield, title: 'Radical Neutrality', desc: 'Zero trading positions. No conflicts. Pure analysis.' },
              { icon: Zap, title: 'Scout Scores', desc: 'Proprietary sentiment metric combining fundamentals, flow, and catalysts.' },
              { icon: TrendingUp, title: 'Institutional Flow', desc: 'On-chain and settlement data proxies for smart money movement.' },
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phantom Portfolio */}
      <PhantomPortfolio />

      {/* Pricing Tiers */}
      <section id="tiers" className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="font-display text-3xl font-bold">Choose Your Intel Level</h2>
            <p className="mt-3 text-muted-foreground">From narrative intelligence to the boardroom.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-6 transition-all ${
                  tier.highlighted
                    ? 'border-primary/50 bg-card glow-brand'
                    : 'border-border/50 bg-card/40'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                {tier.limited && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-3 py-0.5 text-xs font-semibold text-destructive-foreground">
                    12 seats left
                  </div>
                )}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <tier.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold">{tier.name}</h3>
                <div className="mt-2 font-display text-3xl font-bold text-primary">{tier.price}</div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
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

      {/* Disclaimer Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Radical Transparency
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Omni-Scout Africa maintains zero trading positions in any tracked company. All Scout Scores
              are derived from publicly available data and proprietary sentiment analysis. The Phantom Portfolio
              is hypothetical and does not represent actual trading. This is not financial advice.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>© 2026 Omni-Scout Africa</span>
              <span className="text-border">|</span>
              <a href="#" className="hover:text-foreground">Privacy</a>
              <span className="text-border">|</span>
              <a href="#" className="hover:text-foreground">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
