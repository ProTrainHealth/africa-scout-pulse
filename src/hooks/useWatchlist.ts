import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export interface WatchlistItem {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
}

export const useWatchlist = () => {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from('user_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data as unknown as WatchlistItem[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const isTracked = (companyId: string) => items.some(i => i.company_id === companyId);
  const isFreeAndAtLimit = !isActive && items.length >= 5;

  const addToWatchlist = async (companyId: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('user_watchlist')
      .insert({ user_id: user.id, company_id: companyId });
    if (error) throw new Error(error.message);
    await fetchItems();
  };

  const removeFromWatchlist = async (companyId: string) => {
    if (!user) return;
    await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('company_id', companyId);
    await fetchItems();
  };

  return { items, loading, isTracked, isFreeAndAtLimit, addToWatchlist, removeFromWatchlist, count: items.length };
};
