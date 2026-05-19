import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id') || (await req.json().catch(() => ({}))).company_id
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Missing company_id' }), { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check cache first (< 24h old)
    const { data: cached } = await adminClient
      .from('company_enrichment')
      .select('*')
      .eq('company_id', companyId)
      .gte('last_updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (cached && cached.length > 0) {
      return new Response(JSON.stringify({ enrichments: cached, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get company info for context
    const { data: company } = await adminClient
      .from('companies')
      .select('name, country, country_code, sector')
      .eq('id', companyId)
      .single()

    if (!company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404, headers: corsHeaders })
    }

    const enrichments: any[] = []

    // 1) World Bank - GDP indicator for country
    try {
      const countryCode = company.country_code?.toUpperCase() || 'ZAF'
      const wbRes = await fetch(
        `https://api.worldbank.org/v2/country/${countryCode}/indicator/NY.GDP.MKTP.CD?date=2020:2024&format=json&per_page=5`,
        { signal: AbortSignal.timeout(8000) }
      )
      const wbData = await wbRes.json()
      if (Array.isArray(wbData) && wbData[1]?.length > 0) {
        const gdpEntries = wbData[1]
          .filter((e: any) => e.value !== null)
          .map((e: any) => ({ year: e.date, gdp_usd: e.value }))

        if (gdpEntries.length > 0) {
          await adminClient.from('company_enrichment').upsert({
            company_id: companyId,
            source: 'worldbank_gdp',
            data: { country: company.country, country_code: countryCode, gdp_history: gdpEntries },
            last_updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id,source' })
          enrichments.push({ source: 'worldbank_gdp', data: { country: company.country, gdp_history: gdpEntries } })
        }
      }
    } catch (e) {
      enrichments.push({ source: 'worldbank_gdp', error: 'Data unavailable' })
    }

    // 2) Wikipedia - basic company info
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(company.name)}`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const wikiEnrichment = {
          extract: wikiData.extract?.substring(0, 500) || '',
          thumbnail: wikiData.thumbnail?.source || null,
          page_url: wikiData.content_urls?.desktop?.page || null,
        }
        await adminClient.from('company_enrichment').upsert({
          company_id: companyId,
          source: 'wikipedia',
          data: wikiEnrichment,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,source' })
        enrichments.push({ source: 'wikipedia', data: wikiEnrichment })
      }
    } catch (e) {
      enrichments.push({ source: 'wikipedia', error: 'Data unavailable' })
    }

    return new Response(JSON.stringify({ enrichments, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[free-sources-enrich] error:', err)
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
