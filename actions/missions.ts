'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { redirect } from 'next/navigation'
import { Prisma } from '@/app/generated/prisma/client'
import type { MissionType } from '@/app/generated/prisma/client'

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

export async function getMissions(groupId: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  try {
    const missions = await prisma.mission.findMany({
      where: { groupId },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    })

    return missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type as string,
      targetAmount: m.targetAmount ? Number(m.targetAmount) : null,
      currentAmount: Number(m.currentAmount),
      categoryId: m.categoryId,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status as string,
      reward: m.reward,
      createdBy: m.createdBy,
      percent:
        m.targetAmount && Number(m.targetAmount) > 0
          ? Math.round((Number(m.currentAmount) / Number(m.targetAmount)) * 100)
          : 0,
    }))
  } catch {
    return []
  }
}

export async function createMission(data: {
  groupId: string
  title: string
  description?: string
  type: string
  targetAmount?: string
  categoryId?: string
  startDate: string
  endDate: string
  reward: number
}) {
  const user = await requireUser()
  const member = await requireMembership(user.id, data.groupId)

  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new Error('Apenas admin pode criar missões.')
  }

  const mission = await prisma.mission.create({
    data: {
      groupId: data.groupId,
      title: data.title,
      description: data.description || null,
      type: data.type as MissionType,
      targetAmount: data.targetAmount
        ? new Prisma.Decimal(data.targetAmount)
        : null,
      categoryId: data.categoryId || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reward: data.reward,
      createdBy: user.id,
    },
  })

  await logActivity({
    groupId: data.groupId,
    userId: user.id,
    action: 'created_mission',
    description: data.title,
    entityType: 'mission',
    entityId: mission.id,
  })

  return { success: true, id: mission.id }
}

export async function completeMission(missionId: string) {
  const user = await requireUser()

  const mission = await prisma.mission.findUnique({ where: { id: missionId } })
  if (!mission) throw new Error('Missão não encontrada.')
  if (mission.status !== 'active') throw new Error('Missão não está ativa.')

  await requireMembership(user.id, mission.groupId)

  await prisma.mission.update({
    where: { id: missionId },
    data: { status: 'completed' },
  })

  await logActivity({
    groupId: mission.groupId,
    userId: user.id,
    action: 'completed_mission',
    description: mission.title,
    entityType: 'mission',
    entityId: missionId,
  })

  return { success: true }
}

export async function deleteMission(missionId: string) {
  const user = await requireUser()

  const mission = await prisma.mission.findUnique({ where: { id: missionId } })
  if (!mission) throw new Error('Missão não encontrada.')

  const member = await requireMembership(user.id, mission.groupId)
  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new Error('Apenas admin pode excluir missões.')
  }

  await prisma.mission.delete({ where: { id: missionId } })

  return { success: true }
}
