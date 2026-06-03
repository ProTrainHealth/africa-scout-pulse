-- Boardroom waitlist table for when capacity is reached (50 seats).
-- When enforce_boardroom_seat_limit() blocks a new subscription,
-- users should be directed here.

CREATE TABLE IF NOT EXISTS public.boardroom_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id)
);

ALTER TABLE public.boardroom_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist entry"
ON public.boardroom_waitlist FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own waitlist entry"
ON public.boardroom_waitlist FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage waitlist"
ON public.boardroom_waitlist FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Improve the error message on the seat limit function
CREATE OR REPLACE FUNCTION public.enforce_boardroom_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.plan = 'boardroom' AND NEW.status = 'active'
     AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()) THEN
    SELECT COUNT(*) INTO active_count
    FROM public.subscriptions
    WHERE plan = 'boardroom'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
      AND user_id <> NEW.user_id;
    IF active_count >= 50 THEN
      RAISE EXCEPTION 'Boardroom is at capacity (50 seats). Please join the waitlist at /pricing?plan=boardroom&waitlist=1'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;