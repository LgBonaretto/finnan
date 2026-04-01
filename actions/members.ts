'use server'

import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plan-limits'
import { sendInviteEmail } from '@/lib/email'
import { redirect } from 'next/navigation'
import { MemberRole } from '@/app/generated/prisma/client'

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

async function requireRole(userId: string, groupId: string, roles: string[]) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new Error('Você não é membro deste grupo.')
  if (!roles.includes(member.role)) {
    throw new Error('Sem permissão para esta ação.')
  }
  return member
}

export async function getMembers(groupId: string) {
  const user = await requireUser()
  await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  }).then((m) => { if (!m) throw new Error('Sem acesso.') })

  return prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function inviteMember(
  groupId: string,
  email: string,
  role: 'admin' | 'member' | 'child',
) {
  const user = await requireUser()
  await requireRole(user.id, groupId, ['owner', 'admin'])

  const limit = await checkPlanLimit(groupId, 'members')
  if (!limit.allowed) return { error: limit.message }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invite = await prisma.groupInvite.create({
    data: {
      groupId,
      token,
      email: email || null,
      role: role as MemberRole,
      invitedBy: user.id,
      expiresAt,
    },
    include: {
      group: { select: { name: true } },
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${invite.token}`

  // Send invite email if email provided
  if (email) {
    try {
      await sendInviteEmail({
        to: email,
        groupName: invite.group.name,
        inviterName: user.name ?? 'Alguém',
        inviteUrl,
      })
    } catch (err) {
      console.error('[INVITE] Failed to send email:', err)
      // Don't fail the invite if email fails — the link still works
    }
  }

  return { success: true, inviteUrl, token: invite.token }
}

export async function removeMember(groupId: string, userId: string) {
  const user = await requireUser()
  await requireRole(user.id, groupId, ['owner'])

  if (userId === user.id) {
    throw new Error('Você não pode remover a si mesmo.')
  }

  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!target) throw new Error('Membro não encontrado.')

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  })

  return { success: true }
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: 'admin' | 'member' | 'child',
) {
  const user = await requireUser()
  await requireRole(user.id, groupId, ['owner'])

  if (userId === user.id) {
    throw new Error('Você não pode alterar seu próprio papel.')
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role: role as MemberRole },
  })

  return { success: true }
}

export async function acceptInvite(token: string) {
  const user = await requireUser()

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: { group: { select: { name: true } } },
  })

  if (!invite) return { error: 'Convite não encontrado.' }
  if (invite.acceptedAt) return { error: 'Este convite já foi utilizado.' }
  if (invite.declinedAt) return { error: 'Este convite foi recusado.' }
  if (invite.expiresAt < new Date()) return { error: 'Este convite expirou.' }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
  })

  if (existing) return { error: 'Você já é membro deste grupo.' }

  const limit = await checkPlanLimit(invite.groupId, 'members')
  if (!limit.allowed) return { error: limit.message }

  await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        groupId: invite.groupId,
        userId: user.id,
        role: invite.role,
        invitedBy: invite.invitedBy,
      },
    }),
    prisma.groupInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
    // Mark onboarding as completed for invited users
    prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    }),
  ])

  return { success: true, groupName: invite.group.name }
}

export async function declineInvite(token: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
  })

  if (!invite) return { error: 'Convite não encontrado.' }
  if (invite.acceptedAt) return { error: 'Este convite já foi aceito.' }
  if (invite.declinedAt) return { error: 'Este convite já foi recusado.' }

  await prisma.groupInvite.update({
    where: { token },
    data: { declinedAt: new Date() },
  })

  return { success: true }
}

export async function getInviteInfo(token: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group: { select: { name: true } },
    },
  })

  if (!invite) return null
  if (invite.acceptedAt) return { expired: true, reason: 'used' as const }
  if (invite.declinedAt) return { expired: true, reason: 'declined' as const }
  if (invite.expiresAt < new Date()) return { expired: true, reason: 'expired' as const }

  const inviter = await prisma.user.findUnique({
    where: { id: invite.invitedBy },
    select: { name: true },
  })

  return {
    expired: false,
    groupName: invite.group.name,
    inviterName: inviter?.name ?? 'Alguém',
    role: invite.role,
    email: invite.email,
  }
}
