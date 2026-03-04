
-- Create private storage bucket for resources
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', false);

-- Storage policies: admin can upload, authenticated can read via signed URLs
CREATE POLICY "Admins can upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update resources" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete resources" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated can read resources" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'resources'
);

-- Add storage_path column to resources table
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS storage_path text DEFAULT '';

-- Create company_enrichment table for caching free data
CREATE TABLE IF NOT EXISTS public.company_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, source)
);

ALTER TABLE public.company_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view enrichment" ON public.company_enrichment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage enrichment" ON public.company_enrichment FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
