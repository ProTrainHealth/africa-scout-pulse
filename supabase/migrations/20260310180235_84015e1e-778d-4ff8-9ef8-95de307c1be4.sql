
-- Add signal_type to catalysts
ALTER TABLE public.catalysts ADD COLUMN IF NOT EXISTS signal_type text NOT NULL DEFAULT 'neutral';

-- Add market_cap_tier to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS market_cap_tier text NOT NULL DEFAULT 'Mid';

-- Update existing companies with varied tiers
UPDATE public.companies SET market_cap_tier = 'Mega' WHERE market_cap ILIKE '%B%' OR scout_score >= 85;
UPDATE public.companies SET market_cap_tier = 'Large' WHERE market_cap_tier = 'Mid' AND scout_score >= 70;
UPDATE public.companies SET market_cap_tier = 'Small' WHERE scout_score < 50;

-- Update existing catalysts with signal types
UPDATE public.catalysts SET signal_type = 'positive' WHERE type IN ('contract', 'infrastructure', 'financing');
UPDATE public.catalysts SET signal_type = 'risk' WHERE type IN ('regulatory');
UPDATE public.catalysts SET signal_type = 'watch' WHERE type IN ('policy', 'earnings');

-- Create signals table
CREATE TABLE public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  summary text NOT NULL,
  confidence text NOT NULL DEFAULT 'medium',
  analyst_tag text NOT NULL DEFAULT 'Omni-Scout',
  published_at timestamptz NOT NULL DEFAULT now(),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public signals" ON public.signals
  FOR SELECT TO public USING (is_public = true);

CREATE POLICY "Authenticated can view all signals" ON public.signals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage signals" ON public.signals
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create country_context table
CREATE TABLE public.country_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL UNIQUE,
  flag_emoji text NOT NULL DEFAULT '',
  regime_status text NOT NULL DEFAULT 'stable',
  risk_tag text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.country_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view country context" ON public.country_context
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage country context" ON public.country_context
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create scout_score_history table
CREATE TABLE public.scout_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view score history" ON public.scout_score_history
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage score history" ON public.scout_score_history
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for catalysts
ALTER PUBLICATION supabase_realtime ADD TABLE public.catalysts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
