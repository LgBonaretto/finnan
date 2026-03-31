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
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
    memberCount: m.group._count.members,
  }))
}
