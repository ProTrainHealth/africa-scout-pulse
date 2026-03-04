
-- Resources table
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'deep_dive',
  tag text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'pdf',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_resources_category_published ON public.resources (category, published_at DESC);
CREATE INDEX idx_user_watchlist_user_created ON public.user_watchlist (user_id, created_at DESC);
CREATE INDEX idx_companies_scout_score ON public.companies (scout_score DESC);

-- Seed resources data
INSERT INTO public.resources (title, summary, category, tag, file_type, published_at) VALUES
('Nigeria LNG: Catalyst Watch Q1 2026', 'In-depth analysis of Nigeria LNG catalysts and price targets for Q1 2026.', 'deep_dive', 'Energy Transition', 'pdf', '2026-02-14'),
('MTN Group: Scout Score Deep Dive', 'Comprehensive Scout Score breakdown for MTN Group across all metrics.', 'deep_dive', 'Digital Infrastructure', 'pdf', '2026-02-10'),
('Dangote Refinery: Margin Analysis', 'Detailed margin analysis and refinery economics for Dangote.', 'deep_dive', 'Energy Transition', 'pdf', '2026-02-07'),
('Safaricom: M-Pesa Expansion Thesis', 'M-Pesa expansion thesis and TAM analysis for Safaricom.', 'deep_dive', 'Financial Systems', 'pdf', '2026-02-03'),
('Energy Transition: The 2026 Inflection Point', 'Macro-level narrative on Africa''s energy transition inflection in 2026.', 'sector_thesis', 'Energy Transition', 'pdf', '2026-01-28'),
('Strategic Resources: Critical Minerals Race', 'Deep analysis of critical minerals positioning across the continent.', 'sector_thesis', 'Strategic Resources', 'pdf', '2026-01-15'),
('Digital Infrastructure: Fiber & Data Centers', 'Thesis on fiber buildout and data center expansion across Africa.', 'sector_thesis', 'Digital Infrastructure', 'pdf', '2026-01-05'),
('Phantom Portfolio: February 2026 Update', 'Monthly update on the hypothetical Phantom Portfolio performance.', 'phantom_portfolio', 'Portfolio', 'pdf', '2026-02-01'),
('Phantom Portfolio: January 2026 Recap', 'January recap and allocation changes for the Phantom Portfolio.', 'phantom_portfolio', 'Portfolio', 'pdf', '2026-01-31'),
('Phantom Portfolio: 2025 Annual Review', 'Full year 2025 review of the Phantom Portfolio thesis and returns.', 'phantom_portfolio', 'Portfolio', 'pdf', '2025-12-31'),
('Community Discussion: Q1 2026 Outlook', 'Community-driven discussion on Q1 2026 macro outlook.', 'community', 'Discussion', 'link', '2026-02-12'),
('AMA: Scout Score Methodology Explained', 'Ask-me-anything session explaining the Scout Score methodology.', 'community', 'AMA', 'link', '2026-02-05');
