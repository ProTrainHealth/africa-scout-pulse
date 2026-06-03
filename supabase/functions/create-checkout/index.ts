import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError(401, 'Unauthorized')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return jsonError(401, 'Unauthorized')
    }

    const userId = user.id

    const { plan, interval, provider = 'paypal' } = await req.json()

    if (!['analyst', 'boardroom'].includes(plan)) {
      return jsonError(400, 'Invalid plan')
    }

    if (!['paypal', 'paystack'].includes(provider)) {
      return jsonError(400, 'Invalid provider')
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

    const appOrigin = (Deno.env.get('APP_ORIGIN') || '').replace(/\/$/, '')

    if (provider === 'paystack') {
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
      if (!paystackSecretKey) {
        return jsonError(500, 'Payment provider not configured')
      }
      if (!appOrigin) {
        return jsonError(500, 'Application origin not configured')
      }

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount.toString(),
          currency: 'USD',
          metadata: {
            user_id: userId,
            plan,
            interval: validInterval,
          },
          callback_url: `${appOrigin}/dashboard?payment=success&provider=paystack`,
          cancel_url: `${appOrigin}/pricing?payment=canceled`,
        }),
      })

      const paystackData = await paystackRes.json()

      if (!paystackData.status || !paystackData.data?.authorization_url) {
        console.error('[create-checkout] Paystack error:', paystackData)
        return jsonError(500, 'Failed to create payment order')
      }

      return new Response(
        JSON.stringify({ url: paystackData.data.authorization_url, provider: 'paystack', reference: paystackData.data.reference }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PayPal flow (existing)
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const paypalEnv = Deno.env.get('PAYPAL_ENV') || 'sandbox'

    if (!clientId || !clientSecret) {
      return jsonError(500, 'Payment provider not configured')
    }
    if (!appOrigin) {
      return jsonError(500, 'Application origin not configured')
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
      console.error('[create-checkout] PayPal token error:', tokenData)
      return jsonError(500, 'Failed to authenticate with payment provider')
    }

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
          return_url: `${appOrigin}/dashboard?payment=success&provider=paypal`,
          cancel_url: `${appOrigin}/pricing?payment=canceled`,
        },
      }),
    })

    const orderData = await orderRes.json()
    const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')

    if (!approveLink?.href) {
      console.error('[create-checkout] PayPal order error:', orderData)
      return jsonError(500, 'Failed to create payment order')
    }

    return new Response(JSON.stringify({ url: approveLink.href, provider: 'paypal' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[create-checkout] unexpected error:', err)
    return jsonError(500, 'An internal error occurred. Please try again.')
  }
})