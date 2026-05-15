ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS governance_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquidity_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infrastructure_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regulatory_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalyst_score integer NOT NULL DEFAULT 0;