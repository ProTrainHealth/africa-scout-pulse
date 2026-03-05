import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type BillingInterval = 'monthly' | 'quarterly' | 'yearly';

const prices: Record<string, Record<BillingInterval, number>> = {
  analyst: { monthly: 13900, quarterly: 36900, yearly: 129900 },
  boardroom: { monthly: 44900, quarterly: 119900, yearly: 429900 },
};

const priceLabels: Record<string, Record<BillingInterval, string>> = {
  analyst: { monthly: '$139/mo', quarterly: '$369/qtr', yearly: '$1,299/yr' },
  boardroom: { monthly: '$449/mo', quarterly: '$1,199/qtr', yearly: '$4,299/yr' },
};

const tierNames: Record<string, string> = { analyst: 'Analyst', boardroom: 'Boardroom' };
const intervalLabels: Record<BillingInterval, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const provider = 'paypal';
  const plan = params.get('plan') || 'analyst';
  const period = (params.get('period') || 'monthly') as BillingInterval;

  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      setStatus('ready');
    }
  }, [user, authLoading]);
  const initPayPal = async () => {
    try {
      // Create order via existing create-checkout function
      setStatus('ready');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Unable to initialize PayPal');
    }
  };

  const handlePayPalCheckout = async () => {
    setStatus('processing');
    try {
      const res = await supabase.functions.invoke('create-checkout', {
        body: { plan, provider: 'paypal', interval: period },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No PayPal approval URL returned');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'PayPal checkout failed');
      toast({ title: 'Checkout error', description: err.message, variant: 'destructive' });
    }
  };

  const validPlan = prices[plan];
  if (!validPlan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 pt-24 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h1 className="font-display text-2xl font-bold">Invalid Plan</h1>
          <p className="mt-2 text-muted-foreground">The selected plan doesn't exist.</p>
          <Link to="/pricing" className="mt-4 text-primary hover:underline">Back to Pricing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-24">
        <Button variant="ghost" onClick={() => navigate('/pricing')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
        </Button>

        <div className="mx-auto max-w-md">
          <h1 className="font-display text-2xl font-bold">Checkout</h1>

          {/* Order summary */}
          <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-display font-semibold">{tierNames[plan]} Plan</span>
                <span className="font-display font-bold text-primary">{priceLabels[plan][period]}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Billing</span>
                <span>{intervalLabels[period]}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Provider</span>
                <span className="capitalize">{provider}</span>
              </div>
            </div>
          </div>

          {/* Payment action */}
          <div className="mt-6">
            {provider === 'paypal' ? (
              <div className="space-y-4">
                {status === 'error' && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    <AlertCircle className="mb-1 inline h-4 w-4" /> {errorMsg}
                  </div>
                )}
                <Button
                  onClick={handlePayPalCheckout}
                  disabled={status === 'processing'}
                  className="w-full bg-[hsl(210,80%,50%)] hover:bg-[hsl(210,80%,45%)] text-white"
                  size="lg"
                >
                  {status === 'processing' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    'Pay with PayPal'
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Redirecting to Paystack...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
