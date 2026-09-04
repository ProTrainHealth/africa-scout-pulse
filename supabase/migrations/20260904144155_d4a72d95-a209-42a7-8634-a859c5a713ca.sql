CREATE TABLE IF NOT EXISTS public.job_state (
  job_name text PRIMARY KEY,
  lease_until timestamptz,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_state TO service_role;
GRANT SELECT ON public.job_state TO authenticated;

ALTER TABLE public.job_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view job state"
  ON public.job_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.job_state (job_name) VALUES ('scout-score-engine')
ON CONFLICT (job_name) DO NOTHING;