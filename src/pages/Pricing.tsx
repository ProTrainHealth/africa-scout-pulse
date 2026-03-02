import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, BarChart3, Lock, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import FeatureRequestForm from '@/components/FeatureRequestForm';

type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
type PaymentProvider = 'paystack' | 'paypal';

const billingLabels: Record<BillingInterval, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const providerLabels: Record<PaymentProvider, string> = {
  paystack: 'Paystack',
  paypal: 'PayPal',
};

const tiers = [
  {
    name: 'Observer',
    prices: { monthly: 'Free', quarterly: 'Free', yearly: 'Free' } as Record<BillingInterval, string>,
    description: 'Deep dives, sector theses, and narrative intelligence.',
    features: ['Weekly deep-dive reports', 'Sector thesis publications', 'Public Phantom Portfolio', 'Community access'],
    icon: Eye,
    highlighted: false,
    planKey: null as string | null,
    amounts: { monthly: 0, quarterly: 0, yearly: 0 },
  },
  {
    name: 'Analyst',
    prices: { monthly: '$139/mo', quarterly: '$369/qtr', yearly: '$1,299/yr' } as Record<BillingInterval, string>,
    savings: { monthly: null, quarterly: '≈ 11% off', yearly: '≈ 22% off' } as Record<BillingInterval, string | null>,
    description: 'Full dashboard access with real-time Scout Scores.',
    features: ['Everything in Observer', 'Live company ledger', 'Scout Score tracking', 'Catalyst calendar', 'Institutional flow data'],
    icon: BarChart3,
    highlighted: true,
    planKey: 'analyst',
    amounts: { monthly: 13900, quarterly: 36900, yearly: 129900 },
  },
  {
    name: 'Boardroom',
    prices: { monthly: '$449/mo', quarterly: '$1,199/qtr', yearly: '$4,299/yr' } as Record<BillingInterval, string>,
    savings: { monthly: null, quarterly: '≈ 11% off', yearly: '≈ 20% off' } as Record<BillingInterval, string | null>,
    description: 'Private signal room. Limited to 50 seats.',
    features: ['Everything in Analyst', 'Private signal room', 'Private voice notes', 'Management call summaries', 'Monthly video boardroom', 'Direct analyst access'],
    icon: Lock,
    highlighted: false,
    limited: true,
    planKey: 'boardroom',
    amounts: { monthly: 44900, quarterly: 119900, yearly: 429900 },
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const { isActive, plan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const paramPeriod = searchParams.get('period') as BillingInterval | null;
  const paramProvider = searchParams.get('provider') as PaymentProvider | null;

  const [billing, setBilling] = useState<BillingInterval>(
    paramPeriod && ['monthly', 'quarterly', 'yearly'].includes(paramPeriod) ? paramPeriod : 'monthly'
  );
  const [provider, setProvider] = useState<PaymentProvider>(
    paramProvider && ['paystack', 'paypal'].includes(paramProvider)
      ? paramProvider
      : (localStorage.getItem('preferred_provider') as PaymentProvider) || 'paystack'
  );

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('period', billing);
    params.set('provider', provider);
    setSearchParams(params, { replace: true });
    localStorage.setItem('preferred_provider', provider);
  }, [billing, provider]);

  const handleTierClick = (tier: typeof tiers[number]) => {
    if (!tier.planKey) {
      if (!user) {
        navigate('/auth');
      } else {
        navigate('/resources');
      }
      return;
    }

    if (!user) {
      sessionStorage.setItem('return_to', `/pricing?period=${billing}&provider=${provider}`);
      navigate('/auth');
      return;
    }

    if (isActive && plan === tier.planKey) {
      toast({ title: 'Already subscribed', description: `You're already on the ${tier.name} plan.` });
      return;
    }

    navigate(`/checkout?provider=${provider}&plan=${tier.planKey}&period=${billing}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-24">
        <div className="mx-auto mb-8 max-w-lg text-center">
          <h1 className="font-display text-3xl font-bold">Choose Your Intel Level</h1>
          <p className="mt-3 text-muted-foreground">From narrative intelligence to the boardroom.</p>
        </div>

        {/* Billing toggle */}
        <div className="mx-auto mb-4 flex max-w-xs items-center justify-center gap-1 rounded-xl border border-border/50 bg-secondary/50 p-1">
          {(['monthly', 'quarterly', 'yearly'] as BillingInterval[]).map((interval) => (
            <button
              key={interval}
              onClick={() => setBilling(interval)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                billing === interval
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {billingLabels[interval]}
            </button>
          ))}
        </div>

        {/* Provider toggle */}
        <div className="mx-auto mb-10 flex max-w-[200px] items-center justify-center gap-1 rounded-xl border border-border/50 bg-secondary/50 p-1">
          {(['paystack', 'paypal'] as PaymentProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                provider === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {providerLabels[p]}
            </button>
          ))}
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
              {'limited' in tier && tier.limited && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-3 py-0.5 text-xs font-semibold text-destructive-foreground">
                  12 seats left
                </div>
              )}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <tier.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold">{tier.name}</h3>
              <div className="mt-2 font-display text-3xl font-bold text-primary">
                {tier.prices[billing]}
              </div>
              {'savings' in tier && tier.savings && tier.savings[billing] && (
                <div className="mt-1 text-xs font-medium text-accent">
                  {tier.savings[billing]}
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-6 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleTierClick(tier)}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {isActive && plan === tier.planKey
                  ? 'Current Plan'
                  : !tier.planKey
                  ? 'Start Free'
                  : `Upgrade to ${tier.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Feature Request */}
        <div className="mx-auto mt-12 max-w-lg text-center">
          <p className="mb-3 text-sm text-muted-foreground">Don't see what you need?</p>
          <FeatureRequestForm />
        </div>
      </div>
    </div>
  );
};

export default Pricing;
