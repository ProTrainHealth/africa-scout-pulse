ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;

CREATE TABLE IF NOT EXISTS public.macro_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL UNIQUE,
  current_value text NOT NULL,
  trend text NOT NULL CHECK (trend IN ('rising','falling','stable','volatile')),
  unit text,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.macro_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view macro_indicators"
  ON public.macro_indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert macro_indicators"
  ON public.macro_indicators FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update macro_indicators"
  ON public.macro_indicators FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete macro_indicators"
  ON public.macro_indicators FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_macro_indicators_updated_at
  BEFORE UPDATE ON public.macro_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.macro_indicators (indicator, current_value, trend, unit, source) VALUES
  ('Pan-African Composite PMI', '51.3', 'rising', 'index', 'S&P Global 2026'),
  ('USD/ZAR Exchange Rate', '18.42', 'volatile', 'ZAR per USD', 'Bloomberg 2026'),
  ('African Infrastructure Investment', '$93.4B', 'rising', 'USD annual', 'AfDB 2026 Outlook'),
  ('Brent Crude Oil', '$82.10', 'stable', 'USD per barrel', 'ICE 2026'),
  ('Sub-Saharan GDP Growth Forecast', '4.1%', 'rising', 'YoY %', 'IMF WEO 2026'),
  ('African PE Dry Powder', '$7.2B', 'rising', 'USD', 'AVCA 2026'),
  ('Average African Inflation Rate', '18.6%', 'falling', 'CPI %', 'AfDB 2026'),
  ('Commodity Index (Africa-weighted)', '114.2', 'stable', 'index', 'World Bank 2026')
ON CONFLICT (indicator) DO NOTHING;