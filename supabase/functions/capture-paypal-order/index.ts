import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const PRICES: Record<string, Record<string, number>> = {
  analyst: { monthly: 13900, quarterly: 36900, yearly: 129900 },
  boardroom: { monthly: 44900, quarterly: 119900, yearly: 429900 },
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function periodEndFor(interval?: string): string {
  const end = new Date()
  if (interval === 'yearly') end.setFullYear(end.getFullYear() + 1)
  else if (interval === 'quarterly') end.setMonth(end.getMonth() + 3)
  else end.setMonth(end.getMonth() + 1)
  return end.toISOString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json(401, { error: 'Unauthorized' })

    const body = await req.json().catch(() => ({}))
    const orderId = body?.order_id
    if (typeof orderId !== 'string' || !/^[A-Z0-9]{10,30}$/.test(orderId)) return json(400, { error: 'Invalid order_id' })

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    if (!clientId || !clientSecret) return json(500, { error: 'Payment provider not configured' })
    const baseUrl = (Deno.env.get('PAYPAL_ENV') || 'sandbox') === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    const { access_token } = await tokenRes.json()
    if (!access_token) return json(502, { error: 'Payment provider auth failed' })
    const ppHeaders = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, { headers: ppHeaders })
    if (!orderRes.ok) return json(404, { error: 'Order not found' })
    let order = await orderRes.json()
    const unit = order.purchase_units?.[0]
    let meta: { user_id?: string; plan?: string; interval?: string } = {}
    try { meta = JSON.parse(unit?.custom_id ?? '{}') } catch { /* invalid */ }
    if (meta.user_id !== user.id) return json(403, { error: 'Order does not belong to this account' })
    const plan = meta.plan ?? ''
    const interval = meta.interval ?? 'monthly'
    const expected = PRICES[plan]?.[interval]
    if (!expected) return json(400, { error: 'Invalid plan' })
    if (unit?.amount?.currency_code !== 'USD' || unit?.amount?.value !== (expected / 100).toFixed(2)) {
      return json(400, { error: 'Amount mismatch' })
    }

    if (order.status === 'APPROVED') {
      const capRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { ...ppHeaders, 'PayPal-Request-Id': `capture-${orderId}` },
      })
      order = await capRes.json()
      if (!capRes.ok) return json(402, { error: 'Capture failed' })
    }
    if (order.status !== 'COMPLETED') return json(409, { error: `Order not payable (status ${order.status})` })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await admin.from('payment_events').upsert({
      provider: 'paypal', provider_event_id: orderId, event_type: 'ORDER.CAPTURED', user_id: user.id, payload: order,
    }, { onConflict: 'provider,provider_event_id,event_type', ignoreDuplicates: true })

    const { error } = await admin.from('subscriptions').upsert({
      user_id: user.id, plan, status: 'active', payment_provider: 'paypal',
      provider_subscription_id: orderId, provider_customer_id: order.payer?.payer_id ?? null,
      current_period_end: periodEndFor(interval),
    }, { onConflict: 'user_id' })
    if (error) { console.error('[capture-paypal-order] upsert', error); return json(500, { error: 'Could not activate subscription' }) }

    return json(200, { ok: true, plan })
  } catch (err) {
    console.error('[capture-paypal-order]', err)
    return json(500, { error: 'An internal error occurred.' })
  }
})
