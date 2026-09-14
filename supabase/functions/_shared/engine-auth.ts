// Shared authorization for background engine functions.
// Allows either the service role key (pg_cron / server-to-server) or a valid
// user JWT belonging to an admin (browser-triggered "Run Now").
import { createClient } from 'npm:@supabase/supabase-js@2';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type EngineAuth =
  | { ok: true; via: 'service_role' | 'admin'; userId?: string }
  | { ok: false };

export async function authorizeEngineRequest(req: Request): Promise<EngineAuth> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !serviceKey || !supabaseUrl) return { ok: false };

  // a) pg_cron / server-to-server
  if (safeEqual(token, serviceKey)) return { ok: true, via: 'service_role' };

  // b) authenticated admin user
  const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await anon.auth.getClaims(token);
  const userId = data?.claims?.sub as string | undefined;
  if (error || !userId) return { ok: false };

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: role } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (!role) return { ok: false };

  return { ok: true, via: 'admin', userId };
}
