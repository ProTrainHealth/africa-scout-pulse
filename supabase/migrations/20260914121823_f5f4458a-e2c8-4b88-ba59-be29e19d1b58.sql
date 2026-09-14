GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

INSERT INTO public.job_state (job_name) VALUES
  ('ingest-macro-data'), ('price-phantom-portfolio')
ON CONFLICT (job_name) DO NOTHING;