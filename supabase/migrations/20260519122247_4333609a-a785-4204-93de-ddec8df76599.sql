
-- 1) Tighten signals: drop broad authenticated SELECT, replace with subscriber-scoped
DROP POLICY IF EXISTS "Authenticated can view all signals" ON public.signals;

CREATE POLICY "Subscribers can view all signals"
ON public.signals
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.plan IN ('analyst','boardroom')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
);

-- 2) Subscriptions: explicit admin-only write policies (regular users only read own rows)
CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Revoke direct EXECUTE on SECURITY DEFINER functions from anon/authenticated.
-- RLS policies that reference has_role continue to work because policies execute
-- in the security context of the policy owner (postgres), not the caller.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_watchlist_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
