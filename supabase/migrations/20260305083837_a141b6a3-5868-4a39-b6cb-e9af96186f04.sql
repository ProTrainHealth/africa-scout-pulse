-- Attach the enforce_watchlist_limit trigger (function exists but trigger was never created)
DROP TRIGGER IF EXISTS check_watchlist_limit ON public.user_watchlist;
CREATE TRIGGER check_watchlist_limit
  BEFORE INSERT ON public.user_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_watchlist_limit();

-- Update function to include admin bypass
CREATE OR REPLACE FUNCTION public.enforce_watchlist_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count integer;
  user_plan text;
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN NEW;
  END IF;

  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  LIMIT 1;

  IF user_plan IN ('analyst', 'boardroom') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.user_watchlist
  WHERE user_id = NEW.user_id;

  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Free plan allows tracking at most 5 companies. Upgrade to Analyst for unlimited tracking.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON public.user_watchlist(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id, status);