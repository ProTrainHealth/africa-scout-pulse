-- Seed country_context for World Monitor intelligence map

INSERT INTO public.country_context (country, country_code, flag_emoji, heat_intensity, regime_status, risk_tag)
VALUES
  ('Nigeria',       'NG', '🇳🇬', 60, 'Civilian admin — elections upcoming', 'elevated'),
  ('South Africa',  'ZA', '🇿🇦', 45, 'Coalition government — stable', 'stable'),
  ('Kenya',         'KE', '🇰🇪', 40, 'Stable democracy — reform agenda', 'stable'),
  ('Egypt',         'EG', '🇪🇬', 70, 'Military-aligned — regional tension', 'alert'),
  ('Morocco',       'MA', '🇲🇦', 35, 'Stable monarchy — Western Sahara risk', 'stable'),
  ('Ghana',         'GH', '🇬🇭', 30, 'Stable democracy — strong institutions', 'stable'),
  ('Ethiopia',      'ET', '🇪🇹', 75, 'Post-conflict reconstruction — fragile', 'alert'),
  ('DRC',           'CD', '🇨🇩', 85, 'Conflict zone — resource nationalism risk', 'restricted'),
  ('Rwanda',        'RW', '🇷🇼', 25, 'Stable — strong governance', 'stable'),
  ('Tanzania',      'TZ', '🇹🇿', 35, 'Stable — new admin market-friendly', 'stable'),
  ('Senegal',       'SN', '🇸🇳', 30, 'Stable democracy — peaceful transition', 'stable'),
  ('Côte d''Ivoire', 'CI', '🇨🇮', 40, 'Stable — commodity-driven growth', 'stable'),
  ('Mozambique',    'MZ', '🇲🇿', 65, 'Insurgency in Cabo Delgado — LNG paused', 'alert'),
  ('Botswana',      'BW', '🇧🇼', 20, 'Stable democracy — diamond-dependent', 'stable'),
  ('Namibia',       'NA', '🇳🇦', 25, 'Stable — mining-focused economy', 'stable')
ON CONFLICT (id) DO NOTHING;