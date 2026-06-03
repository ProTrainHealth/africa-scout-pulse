import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOTAL = 50;

const BoardroomSeats = () => {
  const [filled, setFilled] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'boardroom')
        .eq('status', 'active');
      if (!cancelled && count !== null) {
        setFilled(count);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const seatsFilled = filled ?? 47; // fallback
  const remaining = TOTAL - seatsFilled;
  const pct = (seatsFilled / TOTAL) * 100;

  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-primary font-semibold">{seatsFilled}/{TOTAL} seats filled</span>
        <span className="text-destructive font-medium">{remaining} left</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default BoardroomSeats;