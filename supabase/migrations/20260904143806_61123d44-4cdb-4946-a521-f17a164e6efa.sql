ALTER TABLE public.macro_indicators DROP CONSTRAINT IF EXISTS macro_indicators_trend_check;
ALTER TABLE public.macro_indicators ADD CONSTRAINT macro_indicators_trend_check
  CHECK (trend IN ('rising','falling','stable','volatile','elevated','compressing'));
CREATE UNIQUE INDEX IF NOT EXISTS macro_indicators_indicator_key ON public.macro_indicators (indicator);
GRANT ALL ON public.macro_indicators TO service_role;