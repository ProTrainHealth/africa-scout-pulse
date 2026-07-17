import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionPlan = 'analyst' | 'boardroom';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'failed';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  payment_provider: 'paystack' | 'paypal';
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        setSubscription(data as Subscription);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    };

    fetchSubscription();

    // Realtime subscription updates
    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  const isActive = !!subscription && subscription.status === 'active' &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return {
    subscription,
    isActive,
    plan: subscription?.plan ?? null,
    loading: loading || authLoading,
  };
};
