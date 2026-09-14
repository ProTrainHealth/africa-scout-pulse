// Ingests macro market indicators (FX, commodities, sovereign risk) into public.macro_indicators.
// Auth: service role key (pg_cron) or an authenticated admin user JWT.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorizeEngineRequest } from '../_shared/engine-auth.ts';

type Trend = 'elevated' | 'compressing' | 'stable';

interface Fetched {
  indicator: string;
  value: number;
  unit: string;
  source: string;
  format: (v: number) => string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function collect(): Promise<Fetched[]> {
  const out: Fetched[] = [];

  // 1) USD/ZAR spot (public, key-less FX endpoint)
  const fx = await getJson('https://api.frankfurter.app/latest?from=USD&to=ZAR');
  const zar = Number(fx?.rates?.ZAR);
  if (Number.isFinite(zar)) {
    out.push({
      indicator: 'USD/ZAR',
      value: zar,
      unit: 'ZAR per USD',
      source: 'Frankfurter FX (ECB)',
      format: (v) => v.toFixed(2),
    });
  }

  // 2) Brent Crude (public commodity endpoint — replace with contracted feed when available)
  const brent = await getJson('https://api.oilpriceapi.com/v1/prices/latest?commodity=brent_crude');
  const brentPrice = Number(brent?.data?.price ?? brent?.price);
  if (Number.isFinite(brentPrice)) {
    out.push({
      indicator: 'Brent Crude',
      value: brentPrice,
      unit: 'USD/bbl',
      source: 'OilPriceAPI',
      format: (v) => `$${v.toFixed(2)}`,
    });
  }

  // 3) Africa Sovereign CDS composite (5Y, bps) — no free public feed; provider endpoint slot.
  const cds = await getJson('https://api.worldgovernmentbonds.com/v1/cds/africa-composite-5y');
  const cdsValue = Number(cds?.spread_bps ?? cds?.value);
  if (Number.isFinite(cdsValue)) {
    out.push({
      indicator: 'Africa Sovereign CDS (5Y)',
      value: cdsValue,
      unit: 'bps',
      source: 'World Government Bonds',
      format: (v) => `${Math.round(v)} bps`,
    });
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = await authorizeEngineRequest(req);
  if (!auth.ok) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const fetched = await collect();
  if (fetched.length === 0) {
    return json({ ok: true, ingested: 0, note: 'No upstream data available' });
  }

  const { data: existing, error: readError } = await supabase
    .from('macro_indicators')
    .select('indicator, current_value')
    .in('indicator', fetched.map((f) => f.indicator));

  if (readError) {
    console.error('[ingest-macro-data] read failed', readError.message);
    return json({ error: 'An internal error occurred.' }, 500);
  }

  const previous = new Map<string, number>();
  for (const row of existing ?? []) {
    const numeric = Number(String(row.current_value).replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) previous.set(row.indicator, numeric);
  }

  const now = new Date().toISOString();
  const rows = fetched.map((f) => {
    const prev = previous.get(f.indicator);
    let trend: Trend = 'stable';
    if (prev !== undefined) {
      if (f.value > prev) trend = 'elevated';
      else if (f.value < prev) trend = 'compressing';
    }
    return {
      indicator: f.indicator,
      current_value: f.format(f.value),
      trend,
      unit: f.unit,
      source: f.source,
      updated_at: now,
    };
  });

  const { error } = await supabase
    .from('macro_indicators')
    .upsert(rows, { onConflict: 'indicator' });

  if (error) {
    console.error('[ingest-macro-data] upsert failed', error.message);
    return json({ error: 'An internal error occurred.' }, 500);
  }

  return json({ ok: true, ingested: rows.length, indicators: rows.map((r) => ({ indicator: r.indicator, current_value: r.current_value, trend: r.trend })) });
});
