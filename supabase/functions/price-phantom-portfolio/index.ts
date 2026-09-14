// Reprices every position in public.phantom_portfolio at market close.
// Auth: service role key (pg_cron) or an authenticated admin user JWT.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizeEngineRequest } from '../_shared/engine-auth.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Deterministic mock market price for a company on a given trading day.
 * Replace with a contracted market-data feed when available; the shape of the
 * function (company_id + previous price -> next price) stays the same.
 */
function mockPrice(companyId: string, previous: number, day: string): number {
  let hash = 0;
  const seed = `${companyId}:${day}`;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  // Daily move within +/- 3%.
  const move = ((hash % 601) - 300) / 10000;
  const next = previous * (1 + move);
  return Math.max(0.01, Math.round(next * 100) / 100);
}


async function setJobState(supabase: any, job: string, patch: Record<string, unknown>) {
  await supabase.from('job_state').upsert(
    { job_name: job, updated_at: new Date().toISOString(), ...patch },
    { onConflict: 'job_name' },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = await authorizeEngineRequest(req);
  if (!auth.ok) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  await setJobState(supabase, 'price-phantom-portfolio', { last_run_at: new Date().toISOString(), last_error: null });

  const { data: positions, error: readError } = await supabase
    .from('phantom_portfolio')
    .select('id, company_id, entry_price, current_price');

  if (readError) {
    console.error('[price-phantom-portfolio] read failed', readError.message);
    await setJobState(supabase, 'price-phantom-portfolio', { last_error: 'An internal error occurred.' });
    return json({ error: 'An internal error occurred.' }, 500);
  }

  if (!positions || positions.length === 0) {
    return json({ ok: true, repriced: 0, note: 'No active positions' });
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const results: { id: string; current_price: number; pct_change: number }[] = [];
  let failed = 0;

  for (const p of positions) {
    const entry = Number(p.entry_price);
    const prev = Number(p.current_price) || entry;
    if (!Number.isFinite(entry) || entry <= 0) {
      failed++;
      continue;
    }

    const price = mockPrice(p.company_id, prev, day);
    const pctChange = Math.round(((price - entry) / entry) * 10000) / 100;

    const { error: updateError } = await supabase
      .from('phantom_portfolio')
      .update({ current_price: price, updated_at: now.toISOString() })
      .eq('id', p.id);

    if (updateError) {
      console.error('[price-phantom-portfolio] update failed', p.id, updateError.message);
      failed++;
      continue;
    }

    results.push({ id: p.id, current_price: price, pct_change: pctChange });
  }

  return json({ ok: true, repriced: results.length, failed, priced_at: now.toISOString(), positions: results });
});
