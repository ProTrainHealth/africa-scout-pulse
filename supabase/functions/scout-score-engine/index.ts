// scout-score-engine
// -----------------------------------------------------------------------------
// Autonomous Scout Score refresh job.
//
// For each tracked company it:
//   1. Collects recent news context (public RSS/news search; degrades gracefully).
//   2. Asks a Gemini model (via the Lovable AI Gateway, OpenAI-compatible API) for
//      a strict JSON verdict: { new_score: 0-100, signal: ACCUMULATE|HOLD|MONITOR }.
//   3. Appends the score to scout_score_history and updates companies.scout_score
//      plus companies.institutional_flow.
//
// Safety rails (required for any scheduled/background AI job):
//   - Bounded work per run (BATCH_SIZE companies max).
//   - Single-flight DB lease so overlapping cron runs exit immediately.
//   - Idempotent progress: companies already scored inside FRESHNESS_HOURS are skipped.
//   - Circuit breaker: 402/403 from the AI gateway pauses the job; repeated 429s park it.
//   - Paused-state guard on entry, with a single probe item to detect recovery.
//   - Deno `delay()` between batches / retries to respect LLM rate limits.
//
// Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (pg_cron / server only).
// -----------------------------------------------------------------------------

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { delay } from 'https://deno.land/std@0.224.0/async/delay.ts';
import { authorizeEngineRequest } from '../_shared/engine-auth.ts';

const JOB_NAME = 'scout-score-engine';
const MODEL = 'google/gemini-3.7-flash';
const BATCH_SIZE = 10;          // companies scored per invocation
const CHUNK_SIZE = 3;           // AI calls issued before pausing
const CHUNK_DELAY_MS = 1500;    // cooldown between chunks (rate-limit friendly)
const FRESHNESS_HOURS = 20;     // skip companies scored more recently than this
const MAX_429_RETRIES = 2;

type Signal = 'ACCUMULATE' | 'HOLD' | 'MONITOR';

const FLOW_BY_SIGNAL: Record<Signal, string> = {
  ACCUMULATE: 'inflow',
  HOLD: 'neutral',
  MONITOR: 'outflow',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Constant-time-ish comparison so the service key can't be probed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Best-effort recent-news context. Never throws — the model works without it. */
async function fetchNewsContext(name: string, country: string): Promise<string> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${name} ${country}`)}&hl=en&gl=US&ceid=US:en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return '';
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
      .map((m) => m[1].trim())
      .slice(1, 9); // first <title> is the feed title
    return titles.join('\n- ');
  } catch {
    return '';
  }
}

interface Verdict { new_score: number; signal: Signal }

type AiOutcome =
  | { kind: 'ok'; verdict: Verdict }
  | { kind: 'blocked'; status: number; message: string }   // 402/403 → pause job
  | { kind: 'rate_limited' }                               // 429 cap hit → park job
  | { kind: 'failed'; message: string };                   // skip this company

/** Single scoring call with bounded backoff on 429/5xx. */
async function scoreCompany(
  apiKey: string,
  company: { name: string; sector: string; country: string; scout_score: number },
  news: string,
): Promise<AiOutcome> {
  const prompt = [
    `Company: ${company.name}`,
    `Sector: ${company.sector}`,
    `Country: ${company.country}`,
    `Current Scout Score: ${company.scout_score}`,
    news ? `Recent headlines:\n- ${news}` : 'Recent headlines: none retrieved.',
    '',
    'Assess momentum and sentiment for this African infrastructure company.',
    'Respond with ONLY a JSON object: {"new_score": <integer 0-100>, "signal": "ACCUMULATE" | "HOLD" | "MONITOR"}.',
    'Stay neutral and evidence-based; if headlines are absent, adjust the current score only marginally.',
  ].join('\n');

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are a neutral equity research engine. Output strict JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      return { kind: 'failed', message: `network: ${(e as Error).message}` };
    }

    // Terminal, workspace-level blocks: halt the whole job.
    if (res.status === 402 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      return {
        kind: 'blocked',
        status: res.status,
        message: body?.error?.message ?? body?.message ??
          (res.status === 402 ? 'AI credits exhausted.' : 'AI access blocked by workspace policy.'),
      };
    }

    // Transient: wait out Retry-After (or backoff) then retry, capped.
    if (res.status === 429 || res.status >= 500) {
      if (attempt === MAX_429_RETRIES) return { kind: 'rate_limited' };
      const retryAfter = Number(res.headers.get('Retry-After'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * Math.pow(2, attempt) + Math.random() * 500;
      await delay(waitMs);
      continue;
    }

    if (!res.ok) {
      return { kind: 'failed', message: `gateway ${res.status}` };
    }

    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { kind: 'failed', message: 'empty completion' };

    try {
      const parsed = JSON.parse(content.replace(/^```(?:json)?|```$/g, '').trim());
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.new_score))));
      const signal = String(parsed.signal).toUpperCase() as Signal;
      if (!Number.isFinite(score) || !(signal in FLOW_BY_SIGNAL)) {
        return { kind: 'failed', message: 'invalid verdict shape' };
      }
      return { kind: 'ok', verdict: { new_score: score, signal } };
    } catch {
      return { kind: 'failed', message: 'unparseable JSON' };
    }
  }
  return { kind: 'rate_limited' };
}

/** Persist a paused / parked state so every entry point can see it. */
async function setJobState(
  supabase: SupabaseClient,
  patch: Record<string, unknown>,
) {
  await supabase.from('job_state')
    .upsert({ job_name: JOB_NAME, updated_at: new Date().toISOString(), ...patch }, { onConflict: 'job_name' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ---- 1. Auth: service role (pg_cron) or an authenticated admin ------------
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = await authorizeEngineRequest(req);
  if (!auth.ok) return json({ error: 'Unauthorized' }, 401);

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured.' }, 500);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const now = new Date();

  // ---- 2. Paused guard + single-flight lease ---------------------------------
  const { data: state } = await supabase
    .from('job_state').select('*').eq('job_name', JOB_NAME).maybeSingle();

  const isPaused = state?.paused === true;
  if (state?.lease_until && new Date(state.lease_until) > now) {
    return json({ ok: true, skipped: 'another run holds the lease' });
  }

  // While paused we process at most ONE probe company to detect recovery.
  const workLimit = isPaused ? 1 : BATCH_SIZE;

  await setJobState(supabase, {
    lease_until: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    last_run_at: now.toISOString(),
  });

  try {
    // ---- 3. Pick companies that have no fresh score (idempotent progress) ----
    const freshCutoff = new Date(now.getTime() - FRESHNESS_HOURS * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('scout_score_history').select('company_id').gte('recorded_at', freshCutoff);
    const doneIds = new Set((recent ?? []).map((r) => r.company_id));

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, sector, country, scout_score')
      .order('updated_at', { ascending: true })
      .limit(60);
    if (companiesError) throw new Error(companiesError.message);

    const queue = (companies ?? []).filter((c) => !doneIds.has(c.id)).slice(0, workLimit);
    if (queue.length === 0) {
      await setJobState(supabase, { lease_until: null, last_error: null });
      return json({ ok: true, processed: 0, note: 'All companies already scored recently' });
    }

    // ---- 4. Score in small chunks with a cooldown between them ---------------
    let processed = 0;
    const failures: string[] = [];

    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
      const chunk = queue.slice(i, i + CHUNK_SIZE);

      for (const company of chunk) {
        const news = await fetchNewsContext(company.name, company.country);
        const outcome = await scoreCompany(apiKey, company, news);

        if (outcome.kind === 'blocked') {
          await setJobState(supabase, {
            paused: true,
            pause_reason: `${outcome.status}: ${outcome.message}`,
            lease_until: null,
          });
          return json({ ok: false, paused: true, processed, reason: outcome.message }, 200);
        }
        if (outcome.kind === 'rate_limited') {
          await setJobState(supabase, {
            lease_until: null,
            last_error: 'Rate limited by AI gateway; parked until next scheduled run.',
          });
          return json({ ok: true, processed, parked: 'rate_limited' });
        }
        if (outcome.kind === 'failed') {
          failures.push(`${company.name}: ${outcome.message}`);
          continue;
        }

        const { new_score, signal } = outcome.verdict;

        // Append history first — it is the idempotency marker for this company.
        const { error: histError } = await supabase.from('scout_score_history').insert({
          company_id: company.id,
          score: new_score,
          recorded_at: new Date().toISOString(),
        });
        if (histError) {
          failures.push(`${company.name}: history ${histError.message}`);
          continue;
        }

        const { error: updError } = await supabase.from('companies').update({
          scout_score: new_score,
          institutional_flow: FLOW_BY_SIGNAL[signal],
          updated_at: new Date().toISOString(),
        }).eq('id', company.id);
        if (updError) failures.push(`${company.name}: update ${updError.message}`);

        processed++;
      }

      if (i + CHUNK_SIZE < queue.length) await delay(CHUNK_DELAY_MS);
    }

    // A successful probe while paused clears the pause and resumes normal batches.
    await setJobState(supabase, {
      lease_until: null,
      paused: isPaused && processed === 0,
      pause_reason: isPaused && processed > 0 ? null : state?.pause_reason ?? null,
      last_error: failures.length ? failures.slice(0, 5).join(' | ') : null,
    });

    return json({ ok: true, processed, failed: failures.length, resumed: isPaused && processed > 0 });
  } catch (err) {
    console.error('[scout-score-engine] error', err);
    await setJobState(supabase, { lease_until: null, last_error: 'internal error' });
    return json({ error: 'An internal error occurred.' }, 500);
  }
});
