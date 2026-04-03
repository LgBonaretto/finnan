'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { logActivity } from '@/lib/activity'
import { checkPlanLimit } from '@/lib/plan-limits'
import { redirect } from 'next/navigation'
import { Prisma } from '@/app/generated/prisma/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

async function requireMembership(userId: string, groupId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new Error('Você não é membro deste grupo.')
  return member
}

// ── Create ───────────────────────────────────────────────────────────────────

type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

type RecurrenceData = {
  frequency: RecurrenceFrequency
  nextDate: string
}

function computeNextDate(date: string, frequency: RecurrenceFrequency): string {
  const d = new Date(date)
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split('T')[0]
}

export async function createTransaction(data: {
  groupId: string
  type: 'income' | 'expense'
  amount: string
  description?: string
  categoryId?: string
  date: string
  recurrence?: RecurrenceFrequency
  recurringDay?: number
}) {
  const user = await requireUser()
  await requireMembership(user.id, data.groupId)

  const limit = await checkPlanLimit(data.groupId, 'transactionsPerMonth')
  if (!limit.allowed) return { error: limit.message }

  const isRecurring = !!data.recurrence
  const recurrence: RecurrenceData | null = data.recurrence
    ? { frequency: data.recurrence, nextDate: computeNextDate(data.date, data.recurrence) }
    : null

  const nextOccurrence = isRecurring
    ? new Date(computeNextDate(data.date, data.recurrence!))
    : null

  const transaction = await prisma.transaction.create({
    data: {
      groupId: data.groupId,
      userId: user.id,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      description: data.description || null,
      categoryId: data.categoryId || null,
      date: new Date(data.date),
      isRecurring,
      recurringInterval: data.recurrence ?? null,
      recurringDay: data.recurringDay ?? null,
      nextOccurrence,
      recurrence: recurrence ?? undefined,
    },
  })

  await Promise.all([
    createAuditLog({
      userId: user.id,
      groupId: data.groupId,
      action: 'create',
      entityType: 'transaction',
      entityId: transaction.id,
      after: transaction,
    }),
    logActivity({
      groupId: data.groupId,
      userId: user.id,
      action: data.type === 'income' ? 'added_income' : 'added_expense',
      description: data.description,
      amount: data.amount,
      entityType: 'transaction',
      entityId: transaction.id,
    }),
  ])

  return { success: true, id: transaction.id }
}

// ── Read (cursor pagination) ─────────────────────────────────────────────────

export async function getTransactions(params: {
  groupId: string
  cursor?: string
  limit?: number
  type?: 'income' | 'expense'
  categoryId?: string
  month?: string
}) {
  const user = await requireUser()
  await requireMembership(user.id, params.groupId)

  const limit = params.limit ?? 20

  const where: Prisma.TransactionWhereInput = {
    groupId: params.groupId,
    deletedAt: null,
  }

  if (params.type) where.type = params.type
  if (params.categoryId) where.categoryId = params.categoryId

  if (params.month) {
    const start = new Date(params.month + '-01')
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    where.date = { gte: start, lt: end }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, color: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(params.cursor
      ? { skip: 1, cursor: { id: params.cursor } }
      : {}),
  })

  const hasMore = transactions.length > limit
  if (hasMore) transactions.pop()

  const nextCursor = hasMore ? transactions[transactions.length - 1]?.id : null

  return { transactions, nextCursor }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  data: {
    type?: 'income' | 'expense'
    amount?: string
    description?: string
    categoryId?: string
    date?: string
  },
) {
  const user = await requireUser()

  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { group: { include: { members: { where: { userId: user.id } } } } },
  })

  if (!existing) throw new Error('Transação não encontrada.')

  const member = existing.group.members[0]
  if (!member) throw new Error('Você não é membro deste grupo.')

  const canEdit =
    existing.userId === user.id ||
    member.role === 'owner' ||
    member.role === 'admin'

  if (!canEdit) throw new Error('Sem permissão para editar esta transação.')

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.amount && { amount: new Prisma.Decimal(data.amount) }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.date && { date: new Date(data.date) }),
    },
  })

  await createAuditLog({
    userId: user.id,
    groupId: existing.groupId,
    action: 'update',
    entityType: 'transaction',
    entityId: id,
    before: existing,
    after: updated,
  })

  return { success: true }
}

// ── Delete (soft) ────────────────────────────────────────────────────────────

export async function deleteTransaction(id: string) {
  const user = await requireUser()

  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { group: { include: { members: { where: { userId: user.id } } } } },
  })

  if (!existing) throw new Error('Transação não encontrada.')

  const member = existing.group.members[0]
  if (!member) throw new Error('Você não é membro deste grupo.')

  const canDelete =
    existing.userId === user.id ||
    member.role === 'owner' ||
    member.role === 'admin'

  if (!canDelete) throw new Error('Sem permissão para excluir esta transação.')

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await createAuditLog({
    userId: user.id,
    groupId: existing.groupId,
    action: 'delete',
    entityType: 'transaction',
    entityId: id,
    before: existing,
  })

  return { success: true }
}

// ── Balance ──────────────────────────────────────────────────────────────────

export async function getBalance(groupId: string, month?: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const dateFilter: Prisma.TransactionWhereInput = {}
  if (month) {
    const start = new Date(month + '-01')
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    dateFilter.date = { gte: start, lt: end }
  }

  const [incomeResult, expenseResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: { groupId, type: 'income', deletedAt: null, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId, type: 'expense', deletedAt: null, ...dateFilter },
      _sum: { amount: true },
    }),
  ])

  const income = Number(incomeResult._sum.amount ?? 0)
  const expense = Number(expenseResult._sum.amount ?? 0)

  return { income, expense, balance: income - expense }
}

// ── Balance by category ──────────────────────────────────────────────────────

export async function getBalanceByCategory(groupId: string, month: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const start = new Date(month + '-01')
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)

  const [grouped, budgets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { groupId, deletedAt: null, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      where: { groupId, month: start },
      include: { category: { select: { id: true, name: true, type: true } } },
    }),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, Number(b.amount)]))

  const categories = await prisma.category.findMany({
    where: { groupId },
    select: { id: true, name: true, type: true, color: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return grouped
    .filter((g) => g.categoryId)
    .map((g) => {
      const cat = categoryMap.get(g.categoryId!)
      const spent = Number(g._sum.amount ?? 0)
      const budget = budgetMap.get(g.categoryId!) ?? 0

      return {
        categoryId: g.categoryId!,
        categoryName: cat?.name ?? 'Sem categoria',
        categoryColor: cat?.color ?? null,
        type: cat?.type ?? 'expense',
        total: spent,
        budget,
        percentOfBudget: budget > 0 ? Math.round((spent / budget) * 100) : null,
      }
    })
    .sort((a, b) => b.total - a.total)
}

// ── Categories for a group ───────────────────────────────────────────────────

export async function getCategories(groupId: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  return prisma.category.findMany({
    where: { groupId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true, color: true },
  })
}
