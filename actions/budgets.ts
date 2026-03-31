'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Prisma } from '@/app/generated/prisma/client'

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

export async function getBudgets(groupId: string, month: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const monthDate = new Date(month + '-01')
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

  const [categories, budgets, spent] = await Promise.all([
    prisma.category.findMany({
      where: { groupId, type: 'expense' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.budget.findMany({
      where: { groupId, month: monthDate },
      select: { id: true, categoryId: true, amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        groupId,
        type: 'expense',
        deletedAt: null,
        date: { gte: monthDate, lt: nextMonth },
      },
      _sum: { amount: true },
    }),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]))
  const spentMap = new Map(spent.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]))

  let totalBudgeted = 0
  let totalSpent = 0

  const items = categories.map((cat) => {
    const budget = budgetMap.get(cat.id)
    const catSpent = spentMap.get(cat.id) ?? 0
    const limit = budget ? Number(budget.amount) : 0

    totalBudgeted += limit
    totalSpent += catSpent

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      budgetId: budget?.id ?? null,
      limit,
      spent: catSpent,
      percent: limit > 0 ? Math.round((catSpent / limit) * 100) : null,
    }
  })

  return { items, totalBudgeted, totalSpent }
}

export async function setBudget(
  groupId: string,
  categoryId: string,
  month: string,
  amount: string,
) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const monthDate = new Date(month + '-01')

  await prisma.budget.upsert({
    where: {
      groupId_categoryId_month: { groupId, categoryId, month: monthDate },
    },
    create: {
      groupId,
      categoryId,
      month: monthDate,
      amount: new Prisma.Decimal(amount),
    },
    update: {
      amount: new Prisma.Decimal(amount),
    },
  })

  return { success: true }
}

export async function deleteBudget(id: string) {
  const user = await requireUser()

  const budget = await prisma.budget.findUnique({ where: { id } })
  if (!budget) throw new Error('Orçamento não encontrado.')

  await requireMembership(user.id, budget.groupId)

  await prisma.budget.delete({ where: { id } })

  return { success: true }
}
