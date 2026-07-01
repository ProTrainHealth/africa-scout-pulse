// Security findings ingest endpoint.
// Accepts POSTs from Sentry, Wiz, GitHub Dependabot/Actions (SARIF), or npm-audit.
// Auth: shared bearer token in `SECURITY_INGEST_TOKEN` (header: Authorization: Bearer <token>)
// Writes into public.security_findings via service role (upsert on source+external_id).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type Status = 'open' | 'in_progress' | 'fixed' | 'ignored';
type Source = 'supabase' | 'wiz' | 'npm-audit' | 'sentry' | 'dependabot' | 'github';

interface IncomingFinding {
  source: Source;
  external_id: string;
  title: string;
  description?: string;
  severity: Severity;
  status?: Status;
  detected_at?: string;
  pr_url?: string;
  fix_note?: string;
  metadata?: Record<string, unknown>;
}

const SEVERITY_MAP: Record<string, Severity> = {
  fatal: 'critical', critical: 'critical',
  error: 'high', high: 'high',
  warning: 'medium', medium: 'medium', moderate: 'medium',
  info: 'info', low: 'low',
};

function normalize(raw: any, source: Source): IncomingFinding | null {
  // Sentry webhook: { data: { issue: { id, title, level, permalink } } }
  if (source === 'sentry' && raw?.data?.issue) {
    const i = raw.data.issue;
    const level = (i.level || i.metadata?.level || 'error').toLowerCase();
    const sev = SEVERITY_MAP[level] ?? 'medium';
    if (sev !== 'critical' && sev !== 'high') return null; // only high/critical
    return {
      source: 'sentry',
      external_id: String(i.id),
      title: i.title ?? i.metadata?.title ?? 'Sentry issue',
      severity: sev,
      status: 'open',
      pr_url: i.permalink,
      metadata: { project: raw.data.project_slug, culprit: i.culprit },
    };
  }
  // GitHub Dependabot alert webhook: { alert: { number, security_advisory, security_vulnerability, html_url, state } }
  if (source === 'dependabot' && raw?.alert) {
    const a = raw.alert;
    const sev = SEVERITY_MAP[(a.security_vulnerability?.severity || 'medium').toLowerCase()] ?? 'medium';
    return {
      source: 'dependabot',
      external_id: `dep-${a.number}`,
      title: a.security_advisory?.summary ?? `Dependabot alert #${a.number}`,
      description: a.security_advisory?.description,
      severity: sev,
      status: a.state === 'fixed' || a.state === 'dismissed' ? 'fixed' : 'open',
      pr_url: a.html_url,
      metadata: { package: a.dependency?.package?.name, ghsa: a.security_advisory?.ghsa_id },
    };
  }
  // Generic passthrough for Wiz / npm-audit / manual: expect our schema.
  if (raw?.source && raw?.external_id && raw?.title && raw?.severity) {
    return raw as IncomingFinding;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = Deno.env.get('SECURITY_INGEST_TOKEN');
  const auth = req.headers.get('Authorization') || '';
  if (!token || auth !== `Bearer ${token}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Source inferred from ?source=... query or body.source
  const url = new URL(req.url);
  const source = (url.searchParams.get('source') || body.source) as Source;
  if (!source) {
    return new Response(JSON.stringify({ error: 'Missing source' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items: IncomingFinding[] = [];
  const rawItems = Array.isArray(body) ? body : Array.isArray(body.findings) ? body.findings : [body];
  for (const r of rawItems) {
    const n = normalize(r, source);
    if (n) items.push(n);
  }
  if (items.length === 0) {
    return new Response(JSON.stringify({ ok: true, ingested: 0, note: 'No qualifying findings' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rows = items.map((i) => ({
    source: i.source,
    external_id: i.external_id,
    title: i.title,
    description: i.description ?? null,
    severity: i.severity,
    status: i.status ?? 'open',
    detected_at: i.detected_at ?? new Date().toISOString(),
    pr_url: i.pr_url ?? null,
    fix_note: i.fix_note ?? null,
    metadata: i.metadata ?? {},
  }));

  const { error } = await supabase
    .from('security_findings')
    .upsert(rows, { onConflict: 'source,external_id' });

  if (error) {
    console.error('ingest error', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, ingested: rows.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
