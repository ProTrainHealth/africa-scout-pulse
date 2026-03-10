
-- Catalysts table
CREATE TABLE public.catalysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'earnings',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  confidence text NOT NULL DEFAULT 'medium',
  source_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalysts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view catalysts" ON public.catalysts
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage catalysts" ON public.catalysts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_catalysts_event_date ON public.catalysts(event_date DESC);
CREATE INDEX idx_catalysts_company_id ON public.catalysts(company_id);

-- Phantom portfolio table
CREATE TABLE public.phantom_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  weight numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phantom_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view phantom portfolio" ON public.phantom_portfolio
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage phantom portfolio" ON public.phantom_portfolio
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
