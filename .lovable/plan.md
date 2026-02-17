

# Payment Integration with Paystack + PayPal and Free Observer Tier

## Overview
Replace the previously planned Stripe integration with **Paystack** (for African markets) and **PayPal** (for international users). The **Observer (Free)** tier will unlock a new `/resources` section with deep dives, sector theses, and community content. Paid tiers (Analyst/Boardroom) continue to gate the live dashboard.

## What Changes

### 1. New "Resources" Section for Free Observers
A new `/resources` page accessible to all signed-up (free) users containing:
- Weekly deep-dive reports
- Sector thesis publications
- Public Phantom Portfolio
- Community access

The Observer "Start Free" button on the homepage will link to `/auth` (sign up), and after sign-up users land on `/resources`.

### 2. Subscriptions Table
Create a `subscriptions` table to track paid users:
- `user_id`, `plan` (analyst/boardroom), `status` (active/canceled/past_due)
- `payment_provider` (paystack/paypal), `provider_subscription_id`, `provider_customer_id`
- `current_period_end`, timestamps
- RLS: users can only read their own subscription

### 3. Paystack Integration (Edge Function)
- A `create-checkout` edge function that creates a Paystack payment link for Analyst ($49/mo) or Boardroom ($299/mo)
- A `payment-webhook` edge function to handle Paystack webhook events (charge.success, subscription.create, subscription.disable) and upsert subscription records
- Requires a **PAYSTACK_SECRET_KEY** secret

### 4. PayPal Integration (Same Edge Functions)
- The `create-checkout` function will also support PayPal, creating a PayPal subscription link
- The `payment-webhook` function handles PayPal webhook events (BILLING.SUBSCRIPTION.ACTIVATED, PAYMENT.SALE.COMPLETED, BILLING.SUBSCRIPTION.CANCELLED)
- Requires **PAYPAL_CLIENT_ID** and **PAYPAL_CLIENT_SECRET** secrets

### 5. Dashboard Gating
- `/dashboard` checks auth + active subscription
- If not logged in, redirect to `/auth`
- If logged in but no active subscription, show a Paywall component with Paystack and PayPal checkout buttons

### 6. Navbar Updates
- Show user email + sign out when logged in (replace "Get Access")
- Show "Resources" link for all logged-in users
- Show "Dashboard" with lock icon for free users, unlocked for paid

### 7. Homepage Tier Buttons
- Observer "Start Free" links to `/auth`
- Analyst/Boardroom "Subscribe" buttons link to `/auth` if not logged in, or trigger checkout if logged in

## Files to Create
- `src/pages/Resources.tsx` -- free content hub
- `src/components/Paywall.tsx` -- upgrade prompt with Paystack/PayPal options
- `src/hooks/useSubscription.ts` -- checks active subscription status
- `supabase/functions/create-checkout/index.ts` -- generates Paystack or PayPal checkout URL
- `supabase/functions/payment-webhook/index.ts` -- handles webhook events from both providers

## Files to Modify
- `src/App.tsx` -- add `/resources` route
- `src/pages/Dashboard.tsx` -- add subscription gate
- `src/pages/Index.tsx` -- update tier button actions, update Observer features text
- `src/components/Navbar.tsx` -- auth-aware nav with Resources link

## Secrets Required
Before implementation, the following API keys will be needed:
- **PAYSTACK_SECRET_KEY** -- from Paystack dashboard
- **PAYPAL_CLIENT_ID** and **PAYPAL_CLIENT_SECRET** -- from PayPal developer dashboard

## Database Migration
- Create `subscriptions` table with RLS (users read own row only, no client writes)
- Enable realtime on subscriptions for instant UI updates after payment

