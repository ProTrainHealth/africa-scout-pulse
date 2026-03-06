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

    const userId = user.id

    const { plan, interval } = await req.json()

    if (!['analyst', 'boardroom'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: corsHeaders })
    }

    const validInterval = ['monthly', 'quarterly', 'yearly'].includes(interval) ? interval : 'monthly'

    const prices: Record<string, Record<string, number>> = {
      analyst: { monthly: 13900, quarterly: 36900, yearly: 129900 },
      boardroom: { monthly: 44900, quarterly: 119900, yearly: 429900 },
    }
    const amount = prices[plan][validInterval]

    const intervalLabels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    }

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), { status: 500, headers: corsHeaders })
    }

    const baseUrl = 'https://api-m.sandbox.paypal.com'

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
      return new Response(JSON.stringify({ error: 'Failed to authenticate with payment provider' }), { status: 500, headers: corsHeaders })
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || ''

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: (amount / 100).toFixed(2) },
          description: `Omni-Scout ${plan} subscription (${intervalLabels[validInterval]})`,
          custom_id: JSON.stringify({ user_id: userId, plan, interval: validInterval }),
        }],
        application_context: {
          return_url: `${origin}/dashboard?payment=success`,
          cancel_url: `${origin}/pricing?payment=canceled`,
        },
      }),
    })

    const orderData = await orderRes.json()
    const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')

    if (!approveLink?.href) {
      return new Response(JSON.stringify({ error: 'Failed to create payment order' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ url: approveLink.href, provider: 'paypal' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
