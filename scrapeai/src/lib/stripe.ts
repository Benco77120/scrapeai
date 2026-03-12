// ============================================================
// Stripe Billing — Subscriptions & Webhooks
// ============================================================
import Stripe from 'stripe'
import { createAdminClient } from './supabase'
import type { Plan } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

const PLAN_FROM_PRICE: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_PRICE_ID || 'price_starter']: 'starter',
  [process.env.STRIPE_PRO_PRICE_ID || 'price_pro']: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business']: 'business',
}

const PLAN_LIMITS: Record<Plan, number> = {
  free: 100, starter: 1000, pro: 5000, business: 20000,
}

// ── Create / retrieve Stripe customer ───────────────────────
export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

// ── Create checkout session ──────────────────────────────────
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const customerId = await getOrCreateCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { supabase_user_id: userId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })

  return session.url!
}

// ── Create billing portal session ───────────────────────────
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

// ── Handle Stripe webhooks ───────────────────────────────────
export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  const supabase = createAdminClient()

  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) return

  await supabase.from('stripe_events').insert({ id: event.id, type: event.type })

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata.supabase_user_id
      const priceId = sub.items.data[0]?.price.id
      const plan = PLAN_FROM_PRICE[priceId] || 'free'

      await supabase.from('profiles').update({
        plan,
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_end_date: new Date(sub.current_period_end * 1000).toISOString(),
        credits_limit: PLAN_LIMITS[plan],
      }).eq('id', userId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata.supabase_user_id
      await supabase.from('profiles').update({
        plan: 'free',
        stripe_subscription_id: null,
        subscription_status: 'cancelled',
        credits_limit: PLAN_LIMITS.free,
      }).eq('id', userId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const userId = sub.metadata.supabase_user_id
      await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('id', userId)
      break
    }
  }

  await supabase
    .from('stripe_events')
    .update({ processed: true })
    .eq('id', event.id)
}
