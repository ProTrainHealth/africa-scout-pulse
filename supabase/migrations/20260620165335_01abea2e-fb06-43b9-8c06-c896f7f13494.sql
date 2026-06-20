CREATE TABLE public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','fixed','ignored')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  pr_url text,
  fix_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

GRANT SELECT, UPDATE ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;

ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read findings" ON public.security_findings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update findings" ON public.security_findings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_security_findings_source ON public.security_findings(source);
CREATE INDEX idx_security_findings_status ON public.security_findings(status);
CREATE INDEX idx_security_findings_severity ON public.security_findings(severity);

CREATE TRIGGER update_security_findings_updated_at
  BEFORE UPDATE ON public.security_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();