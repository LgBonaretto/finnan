'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireGroupMember() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const member = await prisma.groupMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: 'asc' },
    select: { groupId: true, userId: true, role: true },
  })
  if (!member) redirect('/login')
  return { ...member, sessionUserId: session.user.id }
}

export async function getCreditCards() {
  const { groupId } = await requireGroupMember()
  return prisma.creditCard.findMany({
    where: { groupId, deletedAt: null },
    orderBy: { name: 'asc' },
  })
}

export async function createCreditCard(data: {
  name: string
  brand?: string
  lastDigits?: string
  closingDay: number
  dueDay: number
  limitAmount?: number
  color?: string
}) {
  const { groupId } = await requireGroupMember()
  const card = await prisma.creditCard.create({
    data: {
      groupId,
      name: data.name,
      brand: data.brand,
      lastDigits: data.lastDigits,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      limitAmount: data.limitAmount ?? 0,
      color: data.color,
    },
  })
  revalidatePath('/credit-cards')
  return card
}

export async function updateCreditCard(id: string, data: {
  name?: string
  brand?: string
  lastDigits?: string
  closingDay?: number
  dueDay?: number
  limitAmount?: number
  color?: string
}) {
  const { groupId } = await requireGroupMember()
  const card = await prisma.creditCard.update({
    where: { id, groupId },
    data,
  })
  revalidatePath('/credit-cards')
  return card
}

export async function deleteCreditCard(id: string) {
  const { groupId } = await requireGroupMember()
  await prisma.creditCard.update({
    where: { id, groupId },
    data: { deletedAt: new Date() },
  })
  revalidatePath('/credit-cards')
}

export async function createInstallmentTransaction(data: {
  creditCardId: string
  description: string
  totalAmount: number
  installments: number
  firstDate: string
  categoryId?: string
}) {
  const { groupId, sessionUserId } = await requireGroupMember()
  const { Prisma } = await import('@/app/generated/prisma/client')
  const crypto = await import('crypto')

  const card = await prisma.creditCard.findFirst({
    where: { id: data.creditCardId, groupId, deletedAt: null },
  })
  if (!card) throw new Error('Cartão não encontrado')

  const installmentAmount = Number((data.totalAmount / data.installments).toFixed(2))
  const remainder = Number((data.totalAmount - installmentAmount * data.installments).toFixed(2))
  const installmentGroupId = crypto.randomUUID()
  const firstDate = new Date(data.firstDate)

  const transactions = []
  for (let i = 0; i < data.installments; i++) {
    const date = new Date(firstDate)
    date.setMonth(date.getMonth() + i)

    // Primeira parcela absorve a diferença de arredondamento
    const amount = i === 0 ? installmentAmount + remainder : installmentAmount

    transactions.push({
      groupId,
      userId: sessionUserId,
      type: 'expense' as const,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      description: `${data.description} (${i + 1}/${data.installments})`,
      date,
      creditCardId: data.creditCardId,
      installmentNumber: i + 1,
      installmentTotal: data.installments,
      installmentGroupId,
      categoryId: data.categoryId || null,
      metadata: { source: 'installment' },
    })
  }

  await prisma.transaction.createMany({ data: transactions })
  revalidatePath('/transactions')
  revalidatePath('/credit-cards')
  return { success: true, installmentGroupId }
}

// Retorna o compromisso futuro por cartão nos próximos N meses
export async function getCardForecast(months: number = 6) {
  const { groupId } = await requireGroupMember()
  const now = new Date()
  const endDate = new Date(now)
  endDate.setMonth(endDate.getMonth() + months)

  const cards = await prisma.creditCard.findMany({
    where: { groupId, deletedAt: null },
    select: {
      id: true,
      name: true,
      brand: true,
      lastDigits: true,
      limitAmount: true,
      color: true,
      closingDay: true,
      dueDay: true,
    },
  })

  const transactions = await prisma.transaction.findMany({
    where: {
      groupId,
      creditCardId: { not: null },
      deletedAt: null,
      date: { gte: now, lt: endDate },
    },
    select: {
      creditCardId: true,
      amount: true,
      date: true,
      description: true,
      installmentNumber: true,
      installmentTotal: true,
      installmentGroupId: true,
    },
    orderBy: { date: 'asc' },
  })

  return cards.map((card) => {
    const cardTxs = transactions.filter((t) => t.creditCardId === card.id)
    const monthlyTotals: Record<string, { total: number; transactions: typeof cardTxs }> = {}

    for (const tx of cardTxs) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyTotals[key]) monthlyTotals[key] = { total: 0, transactions: [] }
      monthlyTotals[key].total += Number(tx.amount)
      monthlyTotals[key].transactions.push(tx)
    }

    return {
      ...card,
      limitAmount: Number(card.limitAmount),
      monthlyForecast: monthlyTotals,
    }
  })
}
