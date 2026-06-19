-- 1) Tighten the resources storage SELECT policy to paid subscribers only
DROP POLICY IF EXISTS "Authenticated can read resources" ON storage.objects;

CREATE POLICY "Paid subscribers read resources storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resources'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status = 'active'
        AND s.plan IN ('analyst', 'boardroom')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
  )
);

-- 2) Lock down realtime.messages so clients can only subscribe to authorized topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized realtime topic access" ON realtime.messages;

CREATE POLICY "Authorized realtime topic access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admins can subscribe to anything
  public.has_role(auth.uid(), 'admin'::app_role)
  -- Users can subscribe to their own user-scoped topic
  OR realtime.topic() = 'user:' || auth.uid()::text
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  -- Paid subscribers can subscribe to public broadcast topics
  OR (
    realtime.topic() LIKE 'public:%'
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status = 'active'
        AND s.plan IN ('analyst', 'boardroom')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
  )
);