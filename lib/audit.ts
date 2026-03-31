import { prisma } from '@/lib/prisma'

export async function createAuditLog(params: {
  userId: string
  groupId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      groupId: params.groupId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
    },
  })
}
