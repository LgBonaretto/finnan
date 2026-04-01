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

export async function completeOnboarding(data: {
  groupName: string
  groupType: string
  currency: string
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Check if user already has a group — skip creation if so
  const existingMembership = await prisma.groupMember.findFirst({
    where: { userId: session.user.id },
  })

  if (!existingMembership) {
    // Create group with default categories
    await prisma.group.create({
      data: {
        name: data.groupName,
        type: data.groupType,
        ownerId: session.user.id,
        currency: data.currency,
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
  }

  // Mark onboarding as completed
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompleted: true },
  })

  return { success: true }
}
