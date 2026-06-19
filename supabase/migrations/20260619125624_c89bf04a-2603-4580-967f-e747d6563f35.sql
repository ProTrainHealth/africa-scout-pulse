-- 1) Resources table: paid subscribers only for SELECT
DROP POLICY IF EXISTS "Anyone authenticated can view resources" ON public.resources;

CREATE POLICY "Paid subscribers view resources"
ON public.resources FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.plan IN ('analyst', 'boardroom')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
);

-- 2) Remove subscriptions from realtime publication to prevent cross-user billing leakage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions';
  END IF;
END $$;

-- 3) Admin audit log table (P0.5)
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_actions_admin_id_idx ON public.admin_actions(admin_id, created_at DESC);
CREATE INDEX admin_actions_target_idx ON public.admin_actions(target_table, target_id);

GRANT SELECT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.admin_actions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserts only via service_role (edge functions / admin RPCs); no INSERT policy for authenticated.