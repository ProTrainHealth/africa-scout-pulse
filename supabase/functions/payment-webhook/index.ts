import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const provider = body.provider || 'paystack'

    if (provider === 'paystack') {
      // Paystack webhook events
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

      if (event === 'subscription.disable') {
        const customerCode = data.customer?.customer_code
        if (customerCode) {
          await supabaseAdmin.from('subscriptions')
            .update({ status: 'canceled' })
            .eq('provider_customer_id', customerCode)
            .eq('payment_provider', 'paystack')
        }
      }
    } else if (provider === 'paypal') {
      // PayPal webhook events
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
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
