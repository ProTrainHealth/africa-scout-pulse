
-- Create user_watchlist table
CREATE TABLE public.user_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

-- Users can view own watchlist
CREATE POLICY "Users can view own watchlist"
ON public.user_watchlist FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own watchlist items
CREATE POLICY "Users can delete own watchlist"
ON public.user_watchlist FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own watchlist items (limit enforced by trigger)
CREATE POLICY "Users can insert own watchlist"
ON public.user_watchlist FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger to enforce 5-company limit for free/observer users
CREATE OR REPLACE FUNCTION public.enforce_watchlist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
  user_plan text;
BEGIN
  -- Get user's active subscription plan
  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  LIMIT 1;

  -- If user has analyst or boardroom plan, allow unlimited
  IF user_plan IN ('analyst', 'boardroom') THEN
    RETURN NEW;
  END IF;

  -- Count existing watchlist items for this user
  SELECT COUNT(*) INTO current_count
  FROM public.user_watchlist
  WHERE user_id = NEW.user_id;

  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Free plan allows tracking at most 5 companies. Upgrade to Analyst for unlimited tracking.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_watchlist_limit
BEFORE INSERT ON public.user_watchlist
FOR EACH ROW
EXECUTE FUNCTION public.enforce_watchlist_limit();
