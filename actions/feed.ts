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

export type FeedItem = {
  id: string
  userId: string
  userName: string | null
  action: string
  description: string | null
  amount: number | null
  entityType: string | null
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

  const logs = await prisma.activityLog.findMany({
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

  const items: FeedItem[] = logs.map((log) => ({
    id: log.id,
    userId: log.user.id,
    userName: log.user.name,
    action: log.action,
    description: log.description,
    amount: log.amount ? Number(log.amount) : null,
    entityType: log.entityType,
    createdAt: log.createdAt,
  }))

  return { items, nextCursor }
}
