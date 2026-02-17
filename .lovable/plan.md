
# Gate Dashboard Behind Paid Subscription

## Overview
Restrict the `/dashboard` route so only users with an active Analyst ($49/mo) or Boardroom ($299/mo) subscription can access it. Free/Observer users will be redirected to a paywall.

## Steps

### 1. Enable Stripe Integration
Use the Stripe integration tool to connect Stripe to the project. This will provide the tools to create products, prices, and manage subscriptions.

### 2. Create Stripe Products and Prices
- **Analyst** product with a $49/month recurring price
- **Boardroom** product with a $299/month recurring price (limited to 50 seats)

### 3. Create a Subscriptions Table
A new database table `subscriptions` to track active subscriptions:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `plan` (text -- 'analyst' or 'boardroom')
- `status` (text -- 'active', 'canceled', 'past_due', etc.)
- `current_period_end` (timestamptz)
- `created_at` / `updated_at`

RLS policies:
- Users can view their own subscription
- No client-side insert/update/delete (managed via backend webhook)

### 4. Create Stripe Checkout Edge Function
An edge function that:
- Takes a `priceId` parameter
- Creates or retrieves a Stripe customer for the authenticated user
- Creates a Checkout Session for the subscription
- Returns the checkout URL

### 5. Create Stripe Webhook Edge Function
An edge function that listens for Stripe webhook events:
- `checkout.session.completed` -- insert subscription record
- `customer.subscription.updated` -- update status/period
- `customer.subscription.deleted` -- mark as canceled

### 6. Create a `useSubscription` Hook
A React hook that:
- Fetches the current user's subscription from the `subscriptions` table
- Returns `{ subscription, isActive, plan, loading }`
- `isActive` is true when status is 'active' and `current_period_end` is in the future

### 7. Protect the Dashboard Route
Wrap `/dashboard` with a subscription check:
- If not logged in, redirect to `/auth`
- If logged in but no active subscription, show a paywall page with pricing cards linking to Stripe Checkout
- If subscribed (Analyst or Boardroom), render the dashboard normally

### 8. Update Navbar
- Show "Dashboard" link only to subscribed users (or show it but with a lock icon for non-subscribers)
- If user is logged in, show their avatar/email and a sign-out option instead of "Get Access"

## Technical Details

**Files to create:**
- `src/hooks/useSubscription.ts` -- subscription status hook
- `src/components/Paywall.tsx` -- pricing/upgrade prompt shown to non-subscribers
- `supabase/functions/create-checkout/index.ts` -- Stripe checkout session creator
- `supabase/functions/stripe-webhook/index.ts` -- Stripe webhook handler

**Files to modify:**
- `src/pages/Dashboard.tsx` -- add subscription gate at top of component
- `src/components/Navbar.tsx` -- show auth state and conditional dashboard link
- `src/App.tsx` -- no route changes needed (gate is inside Dashboard component)

**Database migration:**
- Create `subscriptions` table with RLS
- Enable realtime on `subscriptions` table for instant UI updates after payment
