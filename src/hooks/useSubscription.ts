import { useState, useEffect, useCallback } from 'react';
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
  const userId = user?.id;

  const refetch = useCallback(async (): Promise<Subscription | null> => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return null;
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    const sub = !error && data ? (data as Subscription) : null;
    setSubscription(sub);
    setLoading(false);
    return sub;
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    void refetch();
  }, [authLoading, refetch]);

  const isActive = !!subscription && subscription.status === 'active' &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return {
    subscription,
    isActive,
    plan: subscription?.plan ?? null,
    loading: loading || authLoading,
    refetch,
  };
};
