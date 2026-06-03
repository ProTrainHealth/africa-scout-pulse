INSERT INTO public.catalysts (company_id, title, type, event_date, confidence, signal_type, notes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Series C Close', 'fundraising', '2026-03-15', 'high', 'positive', 'SolarAfrica closing $50M Series C led by Climate Fund Managers'),
  ('00000000-0000-0000-0000-000000000002', 'Cobalt mine expansion', 'operational', '2026-04-01', 'high', 'positive', 'Phase 2 expansion at Katanga mine expected to double output'),
  ('00000000-0000-0000-0000-000000000003', 'FDA-equivalent approval', 'regulatory', '2026-05-20', 'medium', 'positive', 'NAFDAC approval for AI diagnostic platform pending'),
  ('00000000-0000-0000-0000-000000000004', 'Cairo campus launch', 'operational', '2026-06-10', 'high', 'positive', 'New 20MW hyperscale data centre coming online'),
  ('00000000-0000-0000-0000-000000000005', 'BCEAO licence grant', 'regulatory', '2026-03-28', 'high', 'positive', 'Cross-border payments licence from Central Bank of West Africa'),
  ('00000000-0000-0000-0000-000000000006', 'Durban port contract', 'operational', '2026-07-01', 'medium', 'neutral', 'Transnet tender for smart freight corridor management'),
  ('00000000-0000-0000-0000-000000000007', 'EU offtake agreement', 'commercial', '2026-04-15', 'high', 'positive', 'Green H2 offtake with German utility for 500MW capacity'),
  ('00000000-0000-0000-0000-000000000008', 'Harvest season data', 'operational', '2026-09-01', 'medium', 'neutral', 'Q3 cold chain utilisation data expected to show growth'),
  ('00000000-0000-0000-0000-000000000009', 'Fibre rollout Phase 2', 'operational', '2026-05-05', 'high', 'positive', 'Phase 2 connecting 200K rural households'),
  ('00000000-0000-0000-0000-000000000010', 'Digital banking licence', 'regulatory', '2026-06-20', 'medium', 'positive', 'Bank of Ghana digital banking licence decision'),
  ('00000000-0000-0000-0000-000000000017', 'AWS partnership', 'commercial', '2026-03-20', 'high', 'positive', 'Nairobi Stack joining AWS ISV Accelerate program'),
  ('00000000-0000-0000-0000-000000000029', 'Pan-African license', 'regulatory', '2026-03-25', 'high', 'positive', 'CBK cross-border payment licence for CashFlow Africa'),
  ('00000000-0000-0000-0000-000000000034', 'Carbon credit issuance', 'commercial', '2026-04-08', 'medium', 'positive', 'First carbon credit batch from PAYG solar installations'),
  ('00000000-0000-0000-0000-000000000042', 'Accelerator Demo Day', 'commercial', '2026-03-30', 'medium', 'positive', 'YC Demo Day for portfolio companies'),
  ('00000000-0000-0000-0000-000000000012', 'DFS results', 'operational', '2026-04-22', 'high', 'positive', 'Definitive Feasibility Study expected to confirm economics'),
  ('00000000-0000-0000-0000-000000000027', 'Johannesburg DC2', 'operational', '2026-04-30', 'high', 'positive', 'Second Johannesburg data centre coming online'),
  ('00000000-0000-0000-0000-000000000049', 'Mining licence approval', 'regulatory', '2026-04-12', 'high', 'positive', 'Government mining licence for rare earth extraction'),
  ('00000000-0000-0000-0000-000000000020', 'UEMOA expansion', 'operational', '2026-04-10', 'medium', 'positive', 'Regional expansion across 8 UEMOA countries'),
  ('00000000-0000-0000-0000-000000000045', 'Gov edtech contract', 'commercial', '2026-04-25', 'medium', 'positive', 'Rwanda Ministry of Education digital learning contract'),
  ('00000000-0000-0000-0000-000000000039', 'AfCFTA integration', 'commercial', '2026-04-18', 'medium', 'positive', 'TradeRoute Africa integration with AfCFTA customs platform')
ON CONFLICT DO NOTHING;