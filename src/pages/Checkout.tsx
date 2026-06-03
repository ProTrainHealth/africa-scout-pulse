import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
type PaymentProvider = 'paypal' | 'paystack';

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

  const plan = params.get('plan') || 'analyst';
  const period = (params.get('period') || 'monthly') as BillingInterval;
  const [provider, setProvider] = useState<PaymentProvider>('paypal');

  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('return_to', `/checkout?plan=${plan}&period=${period}`);
      navigate('/auth');
      return;
    }
    if (user) setStatus('ready');
  }, [user, authLoading]);

  const handleCheckout = async () => {
    setStatus('processing');
    try {
      console.log('[Checkout] Invoking create-checkout with:', { plan, interval: period, provider });
      const res = await supabase.functions.invoke('create-checkout', {
        body: { plan, provider, interval: period },
      });

      console.log('[Checkout] Edge function response:', res);

      if (res.error) {
        throw new Error(res.error.message || 'Edge function returned an error');
      }

      if (!res.data?.url) {
        throw new Error(res.data?.error || 'No payment URL returned');
      }

      toast({ title: `Redirecting to ${provider === 'paypal' ? 'PayPal' : 'Paystack'}...`, description: 'You will complete payment on the provider\'s site.' });
      window.location.href = res.data.url;
    } catch (err: any) {
      console.error('[Checkout] Error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Checkout failed');
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
            </div>
          </div>

          {/* Payment provider selection */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProvider('paypal')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  provider === 'paypal'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106Z"/></svg>
                PayPal
              </button>
              <button
                onClick={() => setProvider('paystack')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  provider === 'paystack'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                Paystack
              </button>
            </div>
          </div>

          {/* Payment action */}
          <div className="mt-6 space-y-4">
            {status === 'error' && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mb-1 inline h-4 w-4" /> {errorMsg}
                <Button variant="link" className="ml-2 text-destructive underline p-0 h-auto" onClick={() => setStatus('ready')}>
                  Try again
                </Button>
              </div>
            )}
            <Button
              onClick={handleCheckout}
              disabled={status === 'processing' || status === 'loading'}
              className="w-full"
              size="lg"
            >
              {status === 'processing' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                `Pay with ${provider === 'paypal' ? 'PayPal' : 'Paystack'}`
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              You will be redirected to complete your subscription securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;