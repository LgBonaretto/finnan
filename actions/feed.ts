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

type FeedItem = {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  after: {
    type?: string
    amount?: string | number
    description?: string | null
    name?: string | null
    categoryName?: string | null
  } | null
  createdAt: Date | string
}

export async function getFeed(params: {
  groupId: string
  cursor?: string
  limit?: number
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const user = await requireUser()
  await requireMembership(user.id, params.groupId)

  const limit = params.limit ?? 20

  const logs = await prisma.auditLog.findMany({
    where: { groupId: params.groupId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  })

  const hasMore = logs.length > limit
  if (hasMore) logs.pop()

  const nextCursor = hasMore ? logs[logs.length - 1]?.id : null

  const items: FeedItem[] = logs.map((log) => {
    const afterData = log.after as Record<string, unknown> | null

    return {
      id: log.id,
      userId: log.user?.id ?? null,
      userName: log.user?.name ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      after: afterData
        ? {
            type: afterData.type as string | undefined,
            amount: afterData.amount as string | number | undefined,
            description: afterData.description as string | null | undefined,
            name: afterData.name as string | null | undefined,
            categoryName: undefined,
          }
        : null,
      createdAt: log.createdAt,
    }
  })

  return { items, nextCursor }
}
