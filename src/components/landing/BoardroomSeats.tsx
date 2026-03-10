import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOTAL_CAPACITY = 50;

const BoardroomSeats = () => {
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { count } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('plan', 'boardroom')
        .eq('status', 'active');

      setSeatsLeft(TOTAL_CAPACITY - (count ?? 0));
    };
    fetch();
  }, []);

  if (seatsLeft === null) return null;

  if (seatsLeft <= 0) {
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
        Full — Join Waitlist
      </div>
    );
  }

  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-3 py-0.5 text-xs font-semibold text-destructive-foreground">
      {seatsLeft} seats left
    </div>
  );
};

export default BoardroomSeats;
