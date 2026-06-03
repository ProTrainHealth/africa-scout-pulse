-- Enforce free-tier watchlist limit (5 items) at the database level
-- Prevents bypassing the frontend check.

-- First, create a function to enforce the limit
CREATE OR REPLACE FUNCTION public.enforce_watchlist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_count integer;
  is_paid_user boolean;
BEGIN
  -- Check if user has an active paid subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) INTO is_paid_user;

  -- Free users are limited to 5 watchlist items
  IF NOT is_paid_user THEN
    SELECT COUNT(*) INTO item_count
    FROM public.user_watchlist
    WHERE user_id = NEW.user_id;

    IF item_count >= 5 THEN
      RAISE EXCEPTION 'Free tier watchlist limit is 5 companies. Upgrade to Analyst or Boardroom for unlimited watchlist.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_watchlist_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_watchlist_limit ON public.user_watchlist;
CREATE TRIGGER user_watchlist_limit
BEFORE INSERT ON public.user_watchlist
FOR EACH ROW EXECUTE FUNCTION public.enforce_watchlist_limit();

-- Add RLS policies for user_watchlist if not present
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.user_watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.user_watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.user_watchlist;

CREATE POLICY "Users can view own watchlist"
ON public.user_watchlist FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
ON public.user_watchlist FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
ON public.user_watchlist FOR DELETE TO authenticated
USING (auth.uid() = user_id);