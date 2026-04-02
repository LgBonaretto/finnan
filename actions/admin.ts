'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Plan, UserRole } from '@/app/generated/prisma/client'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== 'SUPERADMIN') {
    throw new Error('Acesso negado.')
  }

  return session.user
}

export type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  isActive: boolean
  createdAt: Date | string
  groups: {
    groupId: string
    groupName: string
    memberRole: string
    plan: string
  }[]
}

export async function getUsers(): Promise<AdminUser[]> {
  await requireSuperAdmin()

  const users = await prisma.user.findMany({
    include: {
      groupMembers: {
        include: {
          group: { select: { id: true, name: true, plan: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    groups: u.groupMembers.map((m) => ({
      groupId: m.group.id,
      groupName: m.group.name,
      memberRole: m.role,
      plan: m.group.plan,
    })),
  }))
}

export async function updateGroupPlan(groupId: string, plan: string) {
  await requireSuperAdmin()

  await prisma.group.update({
    where: { id: groupId },
    data: { plan: plan as Plan },
  })

  return { success: true }
}

export async function updateUserRole(userId: string, role: string) {
  await requireSuperAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
  })

  return { success: true }
}
