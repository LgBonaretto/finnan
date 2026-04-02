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

export async function awardPoints(params: {
  userId: string
  groupId: string
  amount: number
  reason: string
}) {
  await prisma.point.create({
    data: {
      userId: params.userId,
      groupId: params.groupId,
      amount: params.amount,
      reason: params.reason,
    },
  })
}

export type LeaderboardEntry = {
  userId: string
  userName: string | null
  totalPoints: number
  level: string
  levelColor: string
}

function getLevel(points: number): { level: string; color: string } {
  if (points > 500) return { level: 'Expert', color: 'text-yellow-500' }
  if (points > 100) return { level: 'Poupador', color: 'text-blue-500' }
  return { level: 'Iniciante', color: 'text-muted-foreground' }
}

export async function getLeaderboard(
  groupId: string,
): Promise<LeaderboardEntry[]> {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const grouped = await prisma.point.groupBy({
    by: ['userId'],
    where: { groupId },
    _sum: { amount: true },
  })

  if (grouped.length === 0) return []

  const userIds = grouped.map((g) => g.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u.name]))

  return grouped
    .map((g) => {
      const total = g._sum.amount ?? 0
      const { level, color } = getLevel(total)
      return {
        userId: g.userId,
        userName: userMap.get(g.userId) ?? null,
        totalPoints: total,
        level,
        levelColor: color,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

export type PointHistory = {
  id: string
  amount: number
  reason: string
  createdAt: Date | string
}

export async function getMyPoints(
  groupId: string,
): Promise<{ total: number; history: PointHistory[]; level: string; levelColor: string }> {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const [sumResult, history] = await Promise.all([
    prisma.point.aggregate({
      where: { groupId, userId: user.id },
      _sum: { amount: true },
    }),
    prisma.point.findMany({
      where: { groupId, userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const total = sumResult._sum.amount ?? 0
  const { level, color } = getLevel(total)

  return {
    total,
    level,
    levelColor: color,
    history: history.map((p) => ({
      id: p.id,
      amount: p.amount,
      reason: p.reason,
      createdAt: p.createdAt,
    })),
  }
}
