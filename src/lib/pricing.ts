// Single source of truth for plan pricing.
// MUST stay in sync with supabase/functions/create-checkout/index.ts

export type PaidPlan = 'analyst' | 'boardroom';
export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
export type PaymentProvider = 'paypal' | 'paystack';

export const BILLING_INTERVALS: BillingInterval[] = ['monthly', 'quarterly', 'yearly'];
export const PAYMENT_PROVIDERS: PaymentProvider[] = ['paypal', 'paystack'];

/** Amounts in USD cents. */
export const PLAN_PRICES: Record<PaidPlan, Record<BillingInterval, number>> = {
  analyst: { monthly: 13900, quarterly: 36900, yearly: 129900 },
  boardroom: { monthly: 44900, quarterly: 119900, yearly: 429900 },
};

export const PLAN_NAMES: Record<PaidPlan, string> = {
  analyst: 'Analyst',
  boardroom: 'Boardroom',
};

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  monthly: '/mo',
  quarterly: '/qtr',
  yearly: '/yr',
};

export const isPaidPlan = (v: unknown): v is PaidPlan =>
  v === 'analyst' || v === 'boardroom';

export const isBillingInterval = (v: unknown): v is BillingInterval =>
  BILLING_INTERVALS.includes(v as BillingInterval);

export const isPaymentProvider = (v: unknown): v is PaymentProvider =>
  PAYMENT_PROVIDERS.includes(v as PaymentProvider);

export const formatPrice = (plan: PaidPlan, interval: BillingInterval): string => {
  const dollars = PLAN_PRICES[plan][interval] / 100;
  return `$${dollars.toLocaleString('en-US')}${INTERVAL_SUFFIX[interval]}`;
};

/** Discount vs paying monthly for the same coverage, as a rounded percentage. */
export const savingsLabel = (plan: PaidPlan, interval: BillingInterval): string | null => {
  if (interval === 'monthly') return null;
  const months = interval === 'quarterly' ? 3 : 12;
  const baseline = PLAN_PRICES[plan].monthly * months;
  const actual = PLAN_PRICES[plan][interval];
  const pct = Math.round(((baseline - actual) / baseline) * 100);
  return pct > 0 ? `≈ ${pct}% off` : null;
};
