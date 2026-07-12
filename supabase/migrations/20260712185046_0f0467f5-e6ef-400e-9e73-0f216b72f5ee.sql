
-- 1. Revoke blanket anon privileges everywhere in public
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
  END LOOP;
END $$;

-- 2. Re-grant SELECT to anon for genuinely public-read tables
GRANT SELECT ON public.companies       TO anon;
GRANT SELECT ON public.catalysts       TO anon;
GRANT SELECT ON public.country_context TO anon;
GRANT SELECT ON public.phantom_portfolio TO anon;
GRANT SELECT ON public.scout_score_history TO anon;
GRANT SELECT ON public.signals         TO anon;

-- 3. Re-grant appropriate DML to authenticated per policy design
-- User-owned / self-managed tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_watchlist     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT                 ON public.boardroom_waitlist TO authenticated;
GRANT SELECT, INSERT                 ON public.feature_requests   TO authenticated;
GRANT SELECT, INSERT                 ON public.analyst_questions  TO authenticated;
GRANT UPDATE                         ON public.analyst_questions  TO authenticated; -- admin RLS gate
GRANT UPDATE                         ON public.feature_requests   TO authenticated; -- admin RLS gate

-- Read-only-for-authenticated tables (writes via admin/service_role only, gated by RLS)
GRANT SELECT ON public.companies         TO authenticated;
GRANT SELECT ON public.catalysts         TO authenticated;
GRANT SELECT ON public.country_context   TO authenticated;
GRANT SELECT ON public.phantom_portfolio TO authenticated;
GRANT SELECT ON public.scout_score_history TO authenticated;
GRANT SELECT ON public.signals           TO authenticated;
GRANT SELECT ON public.macro_indicators  TO authenticated;
GRANT SELECT ON public.company_enrichment TO authenticated;
GRANT SELECT ON public.briefings         TO authenticated;
GRANT SELECT ON public.resources         TO authenticated;
GRANT SELECT ON public.subscriptions     TO authenticated;
GRANT SELECT ON public.user_roles        TO authenticated;

-- Admin-writable via RLS (must still hold write privilege at grant layer)
GRANT INSERT, UPDATE, DELETE ON public.companies         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.catalysts         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.country_context   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.phantom_portfolio TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scout_score_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.signals           TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.macro_indicators  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_enrichment TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.briefings         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscriptions     TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles        TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.boardroom_waitlist TO authenticated;

-- Admin-audit / security tables: no direct writes from clients (service_role only)
GRANT SELECT ON public.admin_actions     TO authenticated;
GRANT SELECT ON public.security_findings TO authenticated;
GRANT UPDATE ON public.security_findings TO authenticated; -- admin RLS gate

-- 4. Service role: full access on everything
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- 5. GDPR self-delete on profiles
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
