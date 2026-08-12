import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = (userId: string) => {
      // Deferred so we never block the auth state callback.
      setTimeout(async () => {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        if (active) setIsAdmin(!!data);
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) loadRole(currentUser.id);
      else setIsAdmin(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) loadRole(session.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, isAdmin, loading, signOut };
};
