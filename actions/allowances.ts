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

export async function getAllowances(groupId: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const allowances = await prisma.allowance.findMany({
    where: { groupId },
    include: {
      requests: {
        where: { status: 'pending' },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get child user info for each allowance
  const childIds = allowances.map((a) => a.childId)
  const children = await prisma.user.findMany({
    where: { id: { in: childIds } },
    select: { id: true, name: true, email: true },
  })
  const childMap = new Map(children.map((c) => [c.id, c]))

  return allowances.map((a) => ({
    id: a.id,
    childId: a.childId,
    childName: childMap.get(a.childId)?.name ?? 'Membro',
    childEmail: childMap.get(a.childId)?.email ?? null,
    amount: Number(a.amount),
    frequency: a.frequency,
    dayOfMonth: a.dayOfMonth,
    isActive: a.isActive,
    pendingRequests: a.requests.length,
    createdAt: a.createdAt,
  }))
}

export async function createAllowance(data: {
  groupId: string
  childId: string
  amount: string
  frequency: 'weekly' | 'monthly'
  dayOfMonth?: number
}) {
  const user = await requireUser()
  const member = await requireMembership(user.id, data.groupId)
  if (!['owner', 'admin'].includes(member.role)) {
    throw new Error('Sem permissão.')
  }

  // Verify child is a member of the group
  await requireMembership(data.childId, data.groupId)

  // Check if child already has an active allowance
  const existing = await prisma.allowance.findFirst({
    where: { groupId: data.groupId, childId: data.childId, isActive: true },
  })
  if (existing) {
    return { error: 'Este membro já tem uma mesada ativa.' }
  }

  await prisma.allowance.create({
    data: {
      groupId: data.groupId,
      childId: data.childId,
      amount: new Prisma.Decimal(data.amount),
      frequency: data.frequency,
      dayOfMonth: data.dayOfMonth ?? null,
    },
  })

  return { success: true }
}

export async function deleteAllowance(allowanceId: string) {
  const user = await requireUser()

  const allowance = await prisma.allowance.findUnique({
    where: { id: allowanceId },
  })
  if (!allowance) throw new Error('Mesada não encontrada.')

  const member = await requireMembership(user.id, allowance.groupId)
  if (!['owner', 'admin'].includes(member.role)) {
    throw new Error('Sem permissão.')
  }

  await prisma.allowance.update({
    where: { id: allowanceId },
    data: { isActive: false },
  })

  return { success: true }
}

export async function getMyAllowance(groupId: string) {
  const user = await requireUser()
  await requireMembership(user.id, groupId)

  const allowance = await prisma.allowance.findFirst({
    where: { groupId, childId: user.id, isActive: true },
  })

  if (!allowance) return null

  // Calculate available balance: total approved - total requested pending
  const approved = await prisma.allowanceRequest.aggregate({
    where: { allowanceId: allowance.id, status: 'approved' },
    _sum: { amount: true },
  })

  const totalApproved = Number(approved._sum.amount ?? 0)

  return {
    id: allowance.id,
    amount: Number(allowance.amount),
    frequency: allowance.frequency,
    availableBalance: Number(allowance.amount) - totalApproved,
  }
}

export async function requestWithdrawal(data: {
  allowanceId: string
  amount: string
  description: string
}) {
  const user = await requireUser()

  const allowance = await prisma.allowance.findUnique({
    where: { id: data.allowanceId },
  })
  if (!allowance) throw new Error('Mesada não encontrada.')
  if (allowance.childId !== user.id) throw new Error('Sem permissão.')
  if (!allowance.isActive) throw new Error('Mesada inativa.')

  await prisma.allowanceRequest.create({
    data: {
      allowanceId: data.allowanceId,
      amount: new Prisma.Decimal(data.amount),
      reason: data.description,
    },
  })

  return { success: true }
}

export async function approveRequest(requestId: string) {
  const user = await requireUser()

  const request = await prisma.allowanceRequest.findUnique({
    where: { id: requestId },
    include: {
      allowance: {
        include: { group: { select: { id: true } } },
      },
    },
  })
  if (!request) throw new Error('Pedido não encontrado.')
  if (request.status !== 'pending') throw new Error('Pedido já processado.')

  const member = await requireMembership(user.id, request.allowance.groupId)
  if (!['owner', 'admin'].includes(member.role)) {
    throw new Error('Sem permissão.')
  }

  // Approve and create expense transaction
  await prisma.$transaction([
    prisma.allowanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.transaction.create({
      data: {
        groupId: request.allowance.groupId,
        userId: request.allowance.childId,
        type: 'expense',
        amount: request.amount,
        description: `Mesada: ${request.reason ?? 'Retirada aprovada'}`,
        date: new Date(),
      },
    }),
  ])

  return { success: true }
}

export async function declineRequest(requestId: string, reason?: string) {
  const user = await requireUser()

  const request = await prisma.allowanceRequest.findUnique({
    where: { id: requestId },
    include: {
      allowance: { select: { groupId: true } },
    },
  })
  if (!request) throw new Error('Pedido não encontrado.')
  if (request.status !== 'pending') throw new Error('Pedido já processado.')

  const member = await requireMembership(user.id, request.allowance.groupId)
  if (!['owner', 'admin'].includes(member.role)) {
    throw new Error('Sem permissão.')
  }

  await prisma.allowanceRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reason: reason ?? request.reason,
    },
  })

  return { success: true }
}

export async function getMyRequests(allowanceId: string) {
  const user = await requireUser()

  const allowance = await prisma.allowance.findUnique({
    where: { id: allowanceId },
  })
  if (!allowance || allowance.childId !== user.id) {
    throw new Error('Sem permissão.')
  }

  const requests = await prisma.allowanceRequest.findMany({
    where: { allowanceId },
    orderBy: { createdAt: 'desc' },
  })

  return requests.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    reason: r.reason,
    status: r.status,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  }))
}

export async function getPendingRequests(groupId: string) {
  const user = await requireUser()
  const member = await requireMembership(user.id, groupId)
  if (!['owner', 'admin'].includes(member.role)) {
    return []
  }

  const requests = await prisma.allowanceRequest.findMany({
    where: {
      status: 'pending',
      allowance: { groupId, isActive: true },
    },
    include: {
      allowance: { select: { childId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const childIds = requests.map((r) => r.allowance.childId)
  const children = await prisma.user.findMany({
    where: { id: { in: childIds } },
    select: { id: true, name: true },
  })
  const childMap = new Map(children.map((c) => [c.id, c]))

  return requests.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    reason: r.reason,
    childName: childMap.get(r.allowance.childId)?.name ?? 'Membro',
    createdAt: r.createdAt,
  }))
}
