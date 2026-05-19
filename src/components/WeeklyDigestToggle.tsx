import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const WeeklyDigestToggle = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('weekly_digest_opt_in').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setEnabled(!!data?.weekly_digest_opt_in);
        setLoading(false);
      });
  }, [user]);

  const toggle = async (v: boolean) => {
    if (!user) return;
    setEnabled(v);
    const { error } = await supabase.from('profiles').update({ weekly_digest_opt_in: v }).eq('user_id', user.id);
    if (error) { setEnabled(!v); toast.error('Could not save preference'); return; }
    toast.success(v ? 'Subscribed to weekly digest' : 'Unsubscribed');
  };

  if (!user || loading) return null;

  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Weekly Observer digest</p>
          <p className="text-xs text-muted-foreground">New deep dives and sector theses, every Monday.</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} aria-label="Toggle weekly digest" />
    </div>
  );
};

export default WeeklyDigestToggle;
