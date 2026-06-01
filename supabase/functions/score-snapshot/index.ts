// Nightly: snapshot every company's current scout_score into scout_score_history.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) return true;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
  const uid = data?.claims?.sub;
  if (!uid) return false;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: roleRow } = await admin
    .from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle();
  return !!roleRow;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, scout_score');

  if (error) {
    console.error('[score-snapshot] fetch error:', error.message);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = (companies ?? []).map((c) => ({
    company_id: c.id,
    score: c.scout_score ?? 0,
  }));

  if (rows.length === 0) {
    return new Response(JSON.stringify({ inserted: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: insErr } = await supabase.from('scout_score_history').insert(rows);
  if (insErr) {
    console.error('[score-snapshot] insert error:', insErr.message);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ inserted: rows.length, at: new Date().toISOString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
