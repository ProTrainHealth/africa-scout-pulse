import { useNavigate } from 'react-router-dom';
import { Eye, BarChart3, Lock, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const tiers = [
  {
    name: 'Observer',
    price: 'Free',
    description: 'Deep dives, sector theses, and narrative intelligence.',
    features: ['Weekly deep-dive reports', 'Sector thesis publications', 'Public Phantom Portfolio', 'Community access'],
    icon: Eye,
    highlighted: false,
    planKey: null as string | null,
  },
  {
    name: 'Analyst',
    price: '$49/mo',
    description: 'Full dashboard access with real-time Scout Scores.',
    features: ['Everything in Observer', 'Live company ledger', 'Scout Score tracking', 'Catalyst calendar', 'Institutional flow data'],
    icon: BarChart3,
    highlighted: true,
    planKey: 'analyst',
  },
  {
    name: 'Boardroom',
    price: '$299/mo',
    description: 'Private signal room. Limited to 50 seats.',
    features: ['Everything in Analyst', 'Private voice notes', 'Management call summaries', 'Monthly video boardroom', 'Direct analyst access'],
    icon: Lock,
    highlighted: false,
    limited: true,
    planKey: 'boardroom',
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const { isActive, plan } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTierClick = async (tier: typeof tiers[number]) => {
    if (!tier.planKey) {
      // Observer — go to auth/signup
      if (!user) {
        navigate('/auth');
      } else {
        navigate('/resources');
      }
      return;
    }

    if (!user) {
      // Store return intent
      sessionStorage.setItem('return_to', '/dashboard');
      navigate('/auth');
      return;
    }

    if (isActive && plan === tier.planKey) {
      toast({ title: 'Already subscribed', description: `You're already on the ${tier.name} plan.` });
      return;
    }

    // Call checkout edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-checkout', {
        body: { plan: tier.planKey, provider: 'paystack' },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      toast({
        title: 'Checkout error',
        description: err.message || 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-24">
        <div className="mx-auto mb-12 max-w-lg text-center">
          <h1 className="font-display text-3xl font-bold">Choose Your Intel Level</h1>
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
              {'limited' in tier && tier.limited && (
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
                  : tier.price === 'Free'
                  ? 'Start Free'
                  : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
