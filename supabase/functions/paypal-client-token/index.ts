import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null

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

    // Return cached token if still valid (with 2 min buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 120_000) {
      return new Response(JSON.stringify({ accessToken: cachedToken.accessToken, expiresIn: Math.floor((cachedToken.expiresAt - Date.now()) / 1000) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const paypalEnv = Deno.env.get('PAYPAL_ENV') || 'sandbox'

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'PayPal not configured' }), { status: 500, headers: corsHeaders })
    }

    const baseUrl = paypalEnv === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'Failed to get PayPal token' }), { status: 500, headers: corsHeaders })
    }

    cachedToken = {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    }

    return new Response(JSON.stringify({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
