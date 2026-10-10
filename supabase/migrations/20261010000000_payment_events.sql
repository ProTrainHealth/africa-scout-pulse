CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (provider, provider_event_id, event_type)
);
REVOKE ALL ON public.payment_events FROM anon, authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages payment events" ON public.payment_events;
CREATE POLICY "Service role manages payment events" ON public.payment_events FOR ALL TO service_role USING (true) WITH CHECK (true);