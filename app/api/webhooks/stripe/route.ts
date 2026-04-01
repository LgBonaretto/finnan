import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const groupId = session.metadata?.groupId
      const planId = session.metadata?.planId

      if (groupId && planId && session.subscription) {
        await prisma.group.update({
          where: { id: groupId },
          data: {
            plan: planId as 'free' | 'family' | 'group',
            stripeSubId: session.subscription as string,
            stripeCustomerId: session.customer as string,
          },
        })

        await createAuditLog({
          userId: null as unknown as string,
          groupId,
          action: 'plan_upgrade',
          entityType: 'group',
          entityId: groupId,
          after: { plan: planId },
        })
      }
      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subDetails = invoice.parent?.subscription_details
      const subId =
        subDetails && typeof subDetails.subscription === 'string'
          ? subDetails.subscription
          : typeof subDetails?.subscription === 'object'
            ? subDetails.subscription?.id
            : null

      if (subId) {
        const group = await prisma.group.findFirst({
          where: { stripeSubId: subId },
        })
        if (group) {
          await createAuditLog({
            userId: group.ownerId,
            groupId: group.id,
            action: event.type === 'invoice.payment_succeeded'
              ? 'payment_succeeded'
              : 'payment_failed',
            entityType: 'subscription',
            entityId: subId,
          })
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const group = await prisma.group.findFirst({
        where: { stripeSubId: subscription.id },
      })

      if (group) {
        await prisma.group.update({
          where: { id: group.id },
          data: {
            plan: 'free',
            stripeSubId: null,
          },
        })

        await createAuditLog({
          userId: group.ownerId,
          groupId: group.id,
          action: 'plan_downgrade',
          entityType: 'group',
          entityId: group.id,
          before: { plan: group.plan },
          after: { plan: 'free' },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
