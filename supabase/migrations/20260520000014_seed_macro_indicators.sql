-- Seed macro_indicators for World Monitor macro regime panel

INSERT INTO public.macro_indicators (indicator, current_value, trend, unit, source)
VALUES
  ('USD/Africa CE FX Index',    '108.4', 'rising',   null,   'Bloomberg'),
  ('EM Bond Spread (bp)',       '342',   'falling',  'bp',   'JPMorgan EMBI'),
  ('Brent Crude (90d avg)',     '$82.1', 'stable',  '/bbl', 'ICE'),
  ('Africa Sovereign CDS 5Y',   '402',   'falling',  'bp',   'CMA'),
  ('JSE All Share Index',       '82,410','rising',   null,   'JSE'),
  ('NGX All Share Index',       '47,820','rising',   null,   'NGX'),
  ('EGX 30 Index',              '24,510','falling',  null,   'EGX'),
  ('NSE 20 Index',              '1,742', 'rising',   null,   'NSE'),
  ('MSCI EM Africa (MTH)',      '+3.2%', 'rising',   'pct',  'MSCI'),
  ('Gold Price (USD/oz)',       '$2,340','stable',  '/oz',  'LBMA'),
  ('Copper Price (USD/lb)',     '$4.85', 'rising',   '/lb',  'LME'),
  ('Cobalt Price (USD/lb)',     '$22.10','stable',  '/lb',  'LME'),
  ('China PMI Manufacturing',   '50.8',  'stable',  null,   'NBS China'),
  ('US 10Y Yield',              '4.32',  'rising',  'pct',  'Treasury'),
  ('VIX Index',                 '14.6',  'falling',  null,   'CBOE')
ON CONFLICT (id) DO NOTHING;