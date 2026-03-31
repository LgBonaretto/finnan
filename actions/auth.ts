'use server'

import { hash } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function registerUser(data: {
  name: string
  email: string
  password: string
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existing) {
    return { error: 'Este email já está cadastrado.' }
  }

  const passwordHash = await hash(data.password, 12)

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  })

  return { success: true }
}

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      groupMembers: {
        include: { group: true },
      },
    },
  })
}

export async function updateProfile(name: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  })

  return { success: true }
}

export async function updateGroup(groupId: string, name: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('Sem permissão.')
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { name },
  })

  return { success: true }
}
