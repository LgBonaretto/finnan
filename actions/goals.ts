'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Prisma } from '@/app/generated/prisma/client'

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

export async function getGoals(groupId: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const goals = await prisma.goal.findMany({
    where: { groupId },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { contributions: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    targetDate: g.targetDate,
    status: g.status,
    createdBy: g.creator,
    contributionCount: g._count.contributions,
    percent:
      Number(g.targetAmount) > 0
        ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
        : 0,
  }))
}

export async function createGoal(data: {
  groupId: string
  name: string
  description?: string
  targetAmount: string
  targetDate?: string
}) {
  const user = await requireUser()
  await requireMembership(user.id, data.groupId)

  const goal = await prisma.goal.create({
    data: {
      groupId: data.groupId,
      name: data.name,
      description: data.description || null,
      targetAmount: new Prisma.Decimal(data.targetAmount),
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      createdBy: user.id,
    },
  })

  return { success: true, id: goal.id }
}

export async function addContribution(
  goalId: string,
  amount: string,
  note?: string,
) {
  const user = await requireUser()

  const goal = await prisma.goal.findUnique({ where: { id: goalId } })
  if (!goal) throw new Error('Meta não encontrada.')
  if (goal.status !== 'active') throw new Error('Esta meta não está ativa.')

  await requireMembership(user.id, goal.groupId)

  const decimalAmount = new Prisma.Decimal(amount)

  await prisma.$transaction([
    prisma.goalContribution.create({
      data: {
        goalId,
        userId: user.id,
        amount: decimalAmount,
        note: note || null,
      },
    }),
    prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: { increment: decimalAmount },
      },
    }),
  ])

  return { success: true }
}

export async function updateGoalStatus(
  goalId: string,
  status: 'completed' | 'cancelled',
) {
  const user = await requireUser()

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { group: { include: { members: { where: { userId: user.id } } } } },
  })

  if (!goal) throw new Error('Meta não encontrada.')

  const member = goal.group.members[0]
  if (!member) throw new Error('Você não é membro deste grupo.')

  await prisma.goal.update({
    where: { id: goalId },
    data: { status },
  })

  return { success: true }
}

export async function deleteGoal(goalId: string) {
  const user = await requireUser()

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { group: { include: { members: { where: { userId: user.id } } } } },
  })

  if (!goal) throw new Error('Meta não encontrada.')

  const member = goal.group.members[0]
  if (!member) throw new Error('Você não é membro deste grupo.')

  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new Error('Apenas owner ou admin podem excluir metas.')
  }

  await prisma.goal.delete({ where: { id: goalId } })

  return { success: true }
}
