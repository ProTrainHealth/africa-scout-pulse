import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string;
  payment_provider: string;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
}

const OrderHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRecords((data ?? []) as SubscriptionRecord[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-8 flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Payment History</h1>
        </div>

        {records.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
            No payment records found. Subscribe to a plan to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Period Ends</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-display font-semibold capitalize">{r.plan}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.payment_provider}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'active' ? 'bg-accent/20 text-accent' :
                        r.status === 'canceled' ? 'bg-muted text-muted-foreground' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.current_period_end
                        ? new Date(r.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {r.provider_subscription_id ? r.provider_subscription_id.slice(0, 12) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
