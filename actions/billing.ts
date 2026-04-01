'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { PLANS, type PlanId } from '@/lib/plan-limits'
import { redirect } from 'next/navigation'

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

export async function createCheckoutSession(groupId: string, planId: PlanId) {
  const user = await requireUser()

  if (!stripe) {
    return { error: 'Pagamentos não estão configurados.' }
  }

  const plan = PLANS[planId]
  if (!plan || plan.priceMonthly === 0) {
    return { error: 'Plano inválido.' }
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return { error: 'Grupo não encontrado.' }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  })
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Apenas owner ou admin podem gerenciar o plano.' }
  }

  // Get or create Stripe customer
  let customerId = group.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: group.name,
      metadata: { groupId, userId: user.id },
    })
    customerId = customer.id
    await prisma.group.update({
      where: { id: groupId },
      data: { stripeCustomerId: customerId },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          unit_amount: plan.priceMonthly,
          recurring: { interval: 'month' },
          product_data: {
            name: `Tukkan ${plan.name}`,
            description: plan.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { groupId, planId },
    success_url: `${baseUrl}/settings/billing?success=true`,
    cancel_url: `${baseUrl}/settings/billing?canceled=true`,
  })

  return { url: session.url }
}

export async function createPortalSession(groupId: string) {
  const user = await requireUser()

  if (!stripe) {
    return { error: 'Pagamentos não estão configurados.' }
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group?.stripeCustomerId) {
    return { error: 'Nenhuma assinatura encontrada.' }
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  })
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Sem permissão.' }
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: group.stripeCustomerId,
    return_url: `${baseUrl}/settings/billing`,
  })

  return { url: session.url }
}

export async function getSubscription(groupId: string) {
  const user = await requireUser()

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  })
  if (!member) return null

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { plan: true, stripeCustomerId: true, stripeSubId: true },
  })
  if (!group) return null

  let subscription: {
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  } | null = null

  if (stripe && group.stripeSubId) {
    try {
      const sub = await stripe.subscriptions.retrieve(group.stripeSubId, {
        expand: ['items.data'],
      })
      const periodEnd = sub.items.data[0]?.current_period_end
      subscription = {
        status: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      }
    } catch {
      // Subscription not found or API error
    }
  }

  return {
    plan: group.plan,
    stripeConfigured: stripe !== null,
    subscription,
  }
}
