'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

async function requireAdmin(userId: string, groupId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new Error('Você não é membro deste grupo.')
  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new Error('Apenas owner ou admin podem acessar.')
  }
  return member
}

type ChildTransaction = {
  id: string
  description: string | null
  amount: number
  date: Date | string
  categoryName: string | null
  type: string
}

type CategoryUsage = {
  name: string
  total: number
  count: number
}

type ChildReport = {
  userId: string
  name: string
  email: string | null
  totalSpent: number
  previousMonthSpent: number
  variation: number | null
  topCategories: CategoryUsage[]
  recentTransactions: ChildTransaction[]
}

export async function getFamilyReport(
  groupId: string,
  month: string,
): Promise<ChildReport[]> {
  const user = await requireUser()
  await requireAdmin(user.id, groupId)

  // Get all child members
  const children = await prisma.groupMember.findMany({
    where: { groupId, role: 'child' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (children.length === 0) return []

  const start = new Date(month + '-01')
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1)
  const prevEnd = new Date(start.getFullYear(), start.getMonth(), 1)

  const childIds = children.map((c) => c.userId)

  // Fetch all transactions for these children in both months
  const [currentTransactions, previousTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        groupId,
        userId: { in: childIds },
        type: 'expense',
        deletedAt: null,
        date: { gte: start, lt: end },
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.transaction.findMany({
      where: {
        groupId,
        userId: { in: childIds },
        type: 'expense',
        deletedAt: null,
        date: { gte: prevStart, lt: prevEnd },
      },
    }),
  ])

  // Build per-child data
  const prevTotals = new Map<string, number>()
  for (const t of previousTransactions) {
    prevTotals.set(t.userId, (prevTotals.get(t.userId) ?? 0) + Number(t.amount))
  }

  return children.map((child) => {
    const userTx = currentTransactions.filter((t) => t.userId === child.userId)
    const totalSpent = userTx.reduce((sum, t) => sum + Number(t.amount), 0)
    const previousMonthSpent = prevTotals.get(child.userId) ?? 0

    // Category breakdown
    const catMap = new Map<string, { total: number; count: number }>()
    for (const t of userTx) {
      const name = t.category?.name ?? 'Sem categoria'
      const existing = catMap.get(name)
      if (existing) {
        existing.total += Number(t.amount)
        existing.count++
      } else {
        catMap.set(name, { total: Number(t.amount), count: 1 })
      }
    }
    const topCategories = Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Recent transactions
    const recentTransactions = userTx.slice(0, 5).map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      categoryName: t.category?.name ?? null,
      type: t.type,
    }))

    // Variation %
    const variation =
      previousMonthSpent > 0
        ? Math.round(((totalSpent - previousMonthSpent) / previousMonthSpent) * 100)
        : null

    return {
      userId: child.userId,
      name: child.user.name ?? 'Sem nome',
      email: child.user.email,
      totalSpent,
      previousMonthSpent,
      variation,
      topCategories,
      recentTransactions,
    }
  })
}

export async function exportFamilyReportCSV(
  groupId: string,
  month: string,
): Promise<string> {
  const report = await getFamilyReport(groupId, month)

  const header = 'Membro,Total Gasto,Variação Mês Anterior,Categoria Principal'
  const rows = report.map((r) => {
    const topCat = r.topCategories[0]?.name ?? 'N/A'
    const variation = r.variation !== null ? `${r.variation}%` : 'N/A'
    return `${r.name.replace(/,/g, ';')},${r.totalSpent.toFixed(2)},${variation},${topCat}`
  })

  return [header, ...rows].join('\n')
}
