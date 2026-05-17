// Recompute composite scout_score from G/L/I/R/C sub-components using fixed weights.
// Weights: G 25, L 20, I 20, R 20, C 15.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, governance_score, liquidity_score, infrastructure_score, regulatory_score, catalyst_score, scout_score');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let updated = 0;
  for (const c of companies ?? []) {
    const g = c.governance_score ?? 0;
    const l = c.liquidity_score ?? 0;
    const i = c.infrastructure_score ?? 0;
    const r = c.regulatory_score ?? 0;
    const ct = c.catalyst_score ?? 0;
    // Skip companies with no sub-scores set yet — don't blow away a manually curated composite.
    if (!g && !l && !i && !r && !ct) continue;
    const composite = clamp(0.25 * g + 0.20 * l + 0.20 * i + 0.20 * r + 0.15 * ct);
    if (composite === c.scout_score) continue;
    const { error: upErr } = await supabase
      .from('companies')
      .update({ scout_score: composite })
      .eq('id', c.id);
    if (!upErr) updated += 1;
  }

  return new Response(JSON.stringify({ updated, at: new Date().toISOString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
