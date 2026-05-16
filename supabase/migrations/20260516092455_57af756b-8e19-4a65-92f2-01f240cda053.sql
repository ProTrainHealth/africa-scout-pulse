ALTER TABLE public.country_context
  ADD COLUMN IF NOT EXISTS heat_intensity integer NOT NULL DEFAULT 0;