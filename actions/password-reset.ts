'use server'

import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent email enumeration
  if (!user) return { success: true }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  })

  try {
    await sendPasswordResetEmail(email, token)
  } catch (err) {
    console.error('[PASSWORD_RESET] Failed to send email:', err)
    return { error: 'Erro ao enviar email. Tente novamente.' }
  }

  return { success: true }
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!record) {
    return { error: 'Link inválido ou expirado.' }
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } })
    return { error: 'Link expirado. Solicite um novo.' }
  }

  const user = await prisma.user.findUnique({
    where: { email: record.email },
  })

  if (!user) {
    return { error: 'Usuário não encontrado.' }
  }

  const passwordHash = await hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  await prisma.passwordResetToken.delete({ where: { id: record.id } })

  return { success: true }
}
