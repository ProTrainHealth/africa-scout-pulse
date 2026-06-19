import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// PayPal webhook signature verification via PayPal's verify-webhook-signature API.
// Requires PAYPAL_WEBHOOK_ID secret to be configured.
async function verifyPayPalSignature(req: Request, rawBody: string): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  if (!webhookId || !clientId || !clientSecret) {
    console.error('[payment-webhook] PayPal verification secrets missing')
    return false
  }
  const paypalEnv = Deno.env.get('PAYPAL_ENV') || 'sandbox'
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
  if (!tokenData.access_token) return false

  const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  })
  const verifyData = await verifyRes.json()
  return verifyData.verification_status === 'SUCCESS'
}

function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secret || !signature) return false
  const hash = createHmac('sha512', secret).update(rawBody).digest('hex')
  return hash === signature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    let body: any
    try { body = JSON.parse(rawBody) } catch { return jsonError(400, 'Invalid payload') }

    const provider = body.provider || (req.headers.get('paypal-transmission-id') ? 'paypal' : 'paystack')

    // Verify signature for the corresponding provider before any DB writes
    if (provider === 'paypal') {
      const ok = await verifyPayPalSignature(req, rawBody)
      if (!ok) {
        console.warn('[payment-webhook] PayPal signature verification failed')
        return jsonError(401, 'Invalid signature')
      }
    } else if (provider === 'paystack') {
      const ok = verifyPaystackSignature(rawBody, req.headers.get('x-paystack-signature'))
      if (!ok) {
        console.warn('[payment-webhook] Paystack signature verification failed')
        return jsonError(401, 'Invalid signature')
      }
    } else {
      return jsonError(400, 'Unknown provider')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (provider === 'paystack') {
      const event = body.event
      const data = body.data

      if (event === 'charge.success') {
        const metadata = data.metadata
        if (!metadata?.user_id || !metadata?.plan) {
          return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
        }

        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: metadata.user_id,
          plan: metadata.plan,
          status: 'active',
          payment_provider: 'paystack',
          provider_subscription_id: data.reference,
          provider_customer_id: data.customer?.customer_code || null,
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'user_id' })
      }

      if (
        event === 'subscription.disable' ||
        event === 'subscription.not_renew' ||
        event === 'invoice.payment_failed'
      ) {
        const customerCode = data.customer?.customer_code
        const subCode = data.subscription_code || data.subscription?.subscription_code
        const newStatus = event === 'invoice.payment_failed' ? 'past_due' : 'canceled'
        let q = supabaseAdmin
          .from('subscriptions')
          .update({ status: newStatus, current_period_end: new Date().toISOString() })
          .eq('payment_provider', 'paystack')
        if (subCode) q = q.eq('provider_subscription_id', subCode)
        else if (customerCode) q = q.eq('provider_customer_id', customerCode)
        else return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
        await q
      }

      // Plan downgrade — Paystack subscription.create on a different plan
      if (event === 'subscription.create' && data.metadata?.user_id && data.metadata?.plan) {
        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: data.metadata.user_id,
          plan: data.metadata.plan,
          status: 'active',
          payment_provider: 'paystack',
          provider_subscription_id: data.subscription_code || data.id,
          provider_customer_id: data.customer?.customer_code || null,
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'user_id' })
      }

      const eventType = body.event_type
      const resource = body.resource

      if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
        const customId = resource?.purchase_units?.[0]?.custom_id
        if (!customId) {
          return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
        }

        let parsed: { user_id: string; plan: string }
        try {
          parsed = JSON.parse(customId)
        } catch {
          return new Response(JSON.stringify({ received: true }), { headers: corsHeaders })
        }

        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: parsed.user_id,
          plan: parsed.plan,
          status: 'active',
          payment_provider: 'paypal',
          provider_subscription_id: resource.id,
          provider_customer_id: resource.payer?.payer_id || null,
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'user_id' })
      }

      if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
        const subscriptionId = resource?.id
        if (subscriptionId) {
          await supabaseAdmin.from('subscriptions')
            .update({ status: 'canceled' })
            .eq('provider_subscription_id', subscriptionId)
            .eq('payment_provider', 'paypal')
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[payment-webhook] error:', err)
    return jsonError(500, 'An internal error occurred.')
  }
})
