-- 1. Dedupe existing catalyst rows, keeping earliest per (company_id, title, event_date)
DELETE FROM public.catalysts a
USING public.catalysts b
WHERE a.company_id = b.company_id
  AND a.title = b.title
  AND a.event_date = b.event_date
  AND a.ctid > b.ctid;

-- 2. Add unique constraint to support real upserts
ALTER TABLE public.catalysts
  ADD CONSTRAINT catalysts_unique_event
  UNIQUE (company_id, title, event_date);

-- 3. Backfill scout sub-score columns from existing scout_score so panels show real data
UPDATE public.companies
SET
  governance_score    = GREATEST(0, LEAST(100, scout_score - 5)),
  liquidity_score     = GREATEST(0, LEAST(100, scout_score - 8)),
  infrastructure_score = GREATEST(0, LEAST(100, scout_score + 2)),
  regulatory_score    = GREATEST(0, LEAST(100, scout_score - 3)),
  catalyst_score      = GREATEST(0, LEAST(100, scout_score + 4))
WHERE governance_score = 0
  AND liquidity_score = 0
  AND infrastructure_score = 0
  AND regulatory_score = 0
  AND catalyst_score = 0;