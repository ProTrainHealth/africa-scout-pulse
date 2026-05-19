
-- 1. Boardroom 50-seat enforcement
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
      RAISE EXCEPTION 'Boardroom is at capacity (50 seats). Join the waitlist.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_boardroom_seat_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subscriptions_boardroom_seat_limit ON public.subscriptions;
CREATE TRIGGER subscriptions_boardroom_seat_limit
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_boardroom_seat_limit();

-- 2. analyst_questions table
CREATE TABLE public.analyst_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  analyst_response text NOT NULL DEFAULT '',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analyst_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boardroom users create own questions"
ON public.analyst_questions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid() AND s.status = 'active' AND s.plan = 'boardroom'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
  )
);

CREATE POLICY "Users view own questions"
ON public.analyst_questions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update questions"
ON public.analyst_questions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER analyst_questions_updated_at
BEFORE UPDATE ON public.analyst_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Weekly digest opt-in on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weekly_digest_opt_in boolean NOT NULL DEFAULT false;
