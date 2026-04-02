'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

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

export type CategoryBreakdown = {
  categoryId: string | null
  categoryName: string
  total: number
  percent: number
}

export type MonthlyComparison = {
  month: string
  label: string
  income: number
  expense: number
}

export type ReportSummary = {
  totalIncome: number
  totalExpense: number
  balance: number
  topCategory: string | null
  topCategoryAmount: number
  averageDailyExpense: number
  transactionCount: number
}

export type ReportData = {
  categoryBreakdown: CategoryBreakdown[]
  monthlyComparison: MonthlyComparison[]
  summary: ReportSummary
}

export async function getReportData(
  groupId: string,
  year: number,
): Promise<ReportData> {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  // Fetch all transactions for the year
  const transactions = await prisma.transaction.findMany({
    where: {
      groupId,
      deletedAt: null,
      date: { gte: yearStart, lt: yearEnd },
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  })

  // Category breakdown (expenses only)
  const categoryTotals = new Map<string, { name: string; total: number }>()
  let totalExpense = 0
  let totalIncome = 0

  for (const t of transactions) {
    const amount = Number(t.amount)
    if (t.type === 'expense') {
      totalExpense += amount
      const key = t.categoryId ?? '__none'
      const name = t.category?.name ?? 'Sem categoria'
      const existing = categoryTotals.get(key)
      if (existing) {
        existing.total += amount
      } else {
        categoryTotals.set(key, { name, total: amount })
      }
    } else {
      totalIncome += amount
    }
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(
    categoryTotals.entries(),
  )
    .map(([categoryId, data]) => ({
      categoryId: categoryId === '__none' ? null : categoryId,
      categoryName: data.name,
      total: data.total,
      percent: totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Monthly comparison
  const monthlyComparison: MonthlyComparison[] = []
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1)
    const monthEnd = new Date(year, m + 1, 1)

    let monthIncome = 0
    let monthExpense = 0

    for (const t of transactions) {
      const d = new Date(t.date)
      if (d >= monthStart && d < monthEnd) {
        if (t.type === 'income') monthIncome += Number(t.amount)
        else monthExpense += Number(t.amount)
      }
    }

    const label = monthStart.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

    monthlyComparison.push({
      month: `${year}-${String(m + 1).padStart(2, '0')}`,
      label,
      income: monthIncome,
      expense: monthExpense,
    })
  }

  // Summary
  const topEntry = categoryBreakdown[0]
  const dayCount = Math.min(
    Math.ceil((Date.now() - yearStart.getTime()) / 86400000),
    365,
  )

  const summary: ReportSummary = {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    topCategory: topEntry?.categoryName ?? null,
    topCategoryAmount: topEntry?.total ?? 0,
    averageDailyExpense: dayCount > 0 ? totalExpense / dayCount : 0,
    transactionCount: transactions.length,
  }

  return { categoryBreakdown, monthlyComparison, summary }
}

export async function exportTransactionsCSV(
  groupId: string,
  year: number,
): Promise<string> {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      groupId,
      deletedAt: null,
      date: { gte: yearStart, lt: yearEnd },
    },
    include: {
      category: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: [{ date: 'desc' }],
  })

  const header = 'Data,Tipo,Descrição,Categoria,Valor,Usuário'
  const rows = transactions.map((t) => {
    const date = new Date(t.date).toLocaleDateString('pt-BR')
    const type = t.type === 'income' ? 'Receita' : 'Despesa'
    const desc = (t.description ?? '').replace(/,/g, ';')
    const cat = t.category?.name ?? ''
    const amount = Number(t.amount).toFixed(2)
    const userName = (t.user.name ?? '').replace(/,/g, ';')
    return `${date},${type},${desc},${cat},${amount},${userName}`
  })

  return [header, ...rows].join('\n')
}
