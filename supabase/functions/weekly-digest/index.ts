// Weekly Observer digest — runs Mondays, emails opted-in users a summary of new deep dives and sector theses.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: resources } = await supabase
      .from('resources')
      .select('id,title,summary,category')
      .in('category', ['deep_dive', 'sector_thesis'])
      .gte('published_at', since)
      .order('published_at', { ascending: false });

    if (!resources || resources.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no new content' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs } = await supabase
      .from('profiles')
      .select('email,display_name')
      .eq('weekly_digest_opt_in', true)
      .not('email', 'is', null);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subscribers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://omni-scout.africa';

    const html = `
      <h2 style="font-family:system-ui;font-size:18px">This week on Omni-Scout</h2>
      <p style="font-family:system-ui;font-size:14px;color:#555">New deep dives and sector theses:</p>
      <ul style="font-family:system-ui;font-size:14px">
        ${resources.map((r) => `
          <li style="margin:8px 0">
            <a href="${APP_ORIGIN}/resources/${r.id}" style="color:#d97706;text-decoration:none">
              <strong>${escapeHtml(r.title)}</strong>
            </a>
            <div style="color:#777;font-size:12px">${escapeHtml(r.summary?.slice(0, 160) ?? '')}</div>
          </li>`).join('')}
      </ul>
      <p style="font-family:system-ui;font-size:12px;color:#999;margin-top:24px">
        Manage your preferences at ${APP_ORIGIN}/resources
      </p>`;

    let sent = 0;
    if (RESEND_KEY) {
      for (const sub of subs) {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Omni-Scout <digest@omni-scout.africa>',
            to: [sub.email],
            subject: `Omni-Scout weekly — ${resources.length} new ${resources.length === 1 ? 'publication' : 'publications'}`,
            html,
          }),
        });
        if (resp.ok) sent++;
      }
    }

    return new Response(JSON.stringify({
      sent,
      eligible: subs.length,
      resources: resources.length,
      mode: RESEND_KEY ? 'live' : 'dry-run (set RESEND_API_KEY to send)',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('weekly-digest error', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
