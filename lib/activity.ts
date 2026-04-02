import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

export async function logActivity(params: {
  groupId: string
  userId: string
  action: string
  description?: string
  amount?: string | number
  entityType?: string
  entityId?: string
}) {
  try {
    await prisma.activityLog.create({
      data: {
        groupId: params.groupId,
        userId: params.userId,
        action: params.action,
        description: params.description ?? null,
        amount: params.amount ? new Prisma.Decimal(String(params.amount)) : null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    })
  } catch {
    // Table may not exist yet - silently skip
  }
}
