'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TransactionType } from '@/app/generated/prisma/client'

const DEFAULT_CATEGORIES = {
  expense: [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Vestuário',
    'Outros',
  ],
  income: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
} as const

export async function createGroup(data: {
  name: string
  type: string
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const group = await prisma.group.create({
    data: {
      name: data.name,
      type: data.type,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'owner',
        },
      },
      categories: {
        createMany: {
          data: [
            ...DEFAULT_CATEGORIES.expense.map((name) => ({
              name,
              type: 'expense' as TransactionType,
            })),
            ...DEFAULT_CATEGORIES.income.map((name) => ({
              name,
              type: 'income' as TransactionType,
            })),
          ],
        },
      },
    },
  })

  return { success: true, groupId: group.id }
}

export async function getGroups() {
  const session = await auth()
  if (!session?.user?.id) return []

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          members: {
            take: 4,
            orderBy: { joinedAt: 'asc' },
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // Fetch month expenses for all groups in one go
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const groupIds = memberships.map((m) => m.groupId)

  const expensesByGroup = groupIds.length > 0
    ? await prisma.transaction.groupBy({
        by: ['groupId'],
        where: {
          groupId: { in: groupIds },
          type: 'expense',
          deletedAt: null,
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      })
    : []

  const expenseMap = new Map(
    expensesByGroup.map((e) => [e.groupId, Number(e._sum.amount ?? 0)]),
  )

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
    memberCount: m.group._count.members,
    memberNames: m.group.members.map((gm) => gm.user.name ?? 'Sem nome'),
    monthExpense: expenseMap.get(m.groupId) ?? 0,
  }))
}
