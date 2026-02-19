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
    const userEmail = user.email

    const { plan, provider, interval } = await req.json()

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

    if (provider === 'paypal') {
      const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: 'PayPal not configured' }), { status: 500, headers: corsHeaders })
      }

      const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      })
      const tokenData = await tokenRes.json()

      const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
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
            return_url: `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/dashboard?payment=success`,
            cancel_url: `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/pricing?payment=canceled`,
          },
        }),
      })

      const orderData = await orderRes.json()
      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')

      return new Response(JSON.stringify({ url: approveLink?.href, provider: 'paypal' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Default: Paystack
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackKey) {
      return new Response(JSON.stringify({ error: 'Paystack not configured' }), { status: 500, headers: corsHeaders })
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount,
        currency: 'USD',
        callback_url: `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/dashboard?payment=success`,
        metadata: { user_id: userId, plan, interval: validInterval, custom_fields: [] },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || 'Paystack error' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ url: paystackData.data.authorization_url, provider: 'paystack' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
