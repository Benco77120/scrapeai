// ============================================================
// POST /api/stripe/webhook — Handle Stripe webhook events
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  try {
    await handleStripeWebhook(Buffer.from(body), signature)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// Stripe requires raw body — disable body parsing
export const runtime = 'nodejs'
