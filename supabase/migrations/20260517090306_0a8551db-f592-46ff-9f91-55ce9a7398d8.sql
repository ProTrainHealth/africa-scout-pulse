
-- Briefings table
CREATE TABLE public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  analyst_id uuid,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage briefings"
ON public.briefings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Boardroom subscribers view briefings"
ON public.briefings FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.plan = 'boardroom'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
);

CREATE TRIGGER update_briefings_updated_at
BEFORE UPDATE ON public.briefings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Push subscriptions (Web Push)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs"
ON public.push_subscriptions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Private storage bucket for briefings audio
INSERT INTO storage.buckets (id, name, public) VALUES ('briefings', 'briefings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins upload briefings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'briefings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update briefings"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'briefings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete briefings"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'briefings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Boardroom read briefings storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'briefings'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status = 'active'
        AND s.plan = 'boardroom'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
  )
);
