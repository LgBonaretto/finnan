'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

function computeNextDate(date: Date, interval: string): Date {
  const d = new Date(date)
  switch (interval) {
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
  return d
}

export async function processRecurringTransactions() {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const dueTransactions = await prisma.transaction.findMany({
    where: {
      isRecurring: true,
      deletedAt: null,
      nextOccurrence: { lte: now },
      recurringInterval: { not: null },
    },
  })

  const results: { created: number; errors: number } = { created: 0, errors: 0 }

  for (const tx of dueTransactions) {
    try {
      const occurrenceDate = tx.nextOccurrence!
      const nextOccurrence = computeNextDate(occurrenceDate, tx.recurringInterval!)

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            groupId: tx.groupId,
            userId: tx.userId,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            categoryId: tx.categoryId,
            date: occurrenceDate,
            isRecurring: false,
            parentTransactionId: tx.id,
            metadata: tx.metadata ?? Prisma.JsonNull,
          },
        }),
        prisma.transaction.update({
          where: { id: tx.id },
          data: {
            nextOccurrence,
            recurrence: {
              frequency: tx.recurringInterval,
              nextDate: nextOccurrence.toISOString().split('T')[0],
            },
          },
        }),
      ])

      results.created++
    } catch {
      results.errors++
    }
  }

  return results
}
