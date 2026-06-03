-- Seed analyst signals for tracked companies

INSERT INTO public.signals (company_id, summary, confidence, analyst_tag, is_public, published_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Strong institutional interest ahead of Series C — multiple term sheets received above valuation expectations.', 'high', 'energy-team', true, '2026-03-01'),
  ('00000000-0000-0000-0000-000000000002', 'Cobalt price floor established at $22/lb — Katanga''s low-cost position makes it a consolidation target.', 'high', 'resources-team', true, '2026-02-28'),
  ('00000000-0000-0000-0000-000000000005', 'BCEAO sandbox graduation imminent — PayAfrique is first-mover in WAEMU cross-border payments.', 'medium', 'fintech-team', true, '2026-03-05'),
  ('00000000-0000-0000-0000-000000000007', 'Green H2 production costs falling faster than expected — Morocco''s solar irradiance gives GreenH2 a structural advantage.', 'high', 'energy-team', true, '2026-03-02'),
  ('00000000-0000-0000-0000-000000000014', 'AfriSat''s LEO constellation secured anchor tenant with MTN — de-risks launch economics.', 'medium', 'infra-team', true, '2026-02-25'),
  ('00000000-0000-0000-0000-000000000017', 'AWS partnership unlocks cloud credits and co-sell motion — Nairobi Stack''s revenue visibility improving.', 'high', 'infra-team', true, '2026-03-04'),
  ('00000000-0000-0000-0000-000000000029', 'Pan-African licence pipeline expanding — CashFlow Africa is the B2B rails play for the continent.', 'high', 'fintech-team', true, '2026-03-03'),
  ('00000000-0000-0000-0000-000000000034', 'Carbon credit marketplace gaining traction — SunKing monetising offset demand from European corporates.', 'medium', 'energy-team', true, '2026-02-27'),
  ('00000000-0000-0000-0000-000000000027', 'AfriCloud''s edge node strategy is winning telco partners in under-served markets — 5 new nodes signed.', 'high', 'infra-team', true, '2026-03-06'),
  ('00000000-0000-0000-0000-000000000012', 'Lithium market tightens as Chinese converter stockpiles decline — DFS timing is favourable.', 'medium', 'resources-team', true, '2026-02-20');
ON CONFLICT (id) DO NOTHING;