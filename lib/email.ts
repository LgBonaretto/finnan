import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Finnan <noreply@finnan.com.br>'

function getBaseUrl() {
  return process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
}

function emailWrapper(content: string) {
  const logoUrl = `${getBaseUrl()}/logo-white.png`
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 0;">
      <div style="background-color: #111; padding: 24px 24px 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <img src="${logoUrl}" alt="Finnan" height="32" style="height: 32px; width: auto;" />
      </div>
      <div style="padding: 32px 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
        ${content}
        <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />
        <p style="color: #aaa; font-size: 12px; line-height: 1.4; margin: 0;">Finnan — Finanças em família</p>
      </div>
    </div>
  `
}

function emailButton(href: string, label: string) {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}"
         style="display: inline-block; padding: 14px 32px;
                background-color: #111; color: #fff; text-decoration: none;
                border-radius: 8px; font-weight: 600; font-size: 15px;">
        ${label}
      </a>
    </div>
  `
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Redefinir sua senha — Finnan',
    html: emailWrapper(`
      <h2 style="color: #111; margin: 0 0 12px; font-size: 22px;">Redefinir senha</h2>
      <p style="color: #555; line-height: 1.6; margin: 0 0 4px;">
        Você solicitou a redefinição da sua senha no Finnan.
        Clique no botão abaixo para criar uma nova senha:
      </p>
      ${emailButton(resetUrl, 'Redefinir senha')}
      <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0;">
        Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.
      </p>
    `),
  })
}

export async function sendInviteEmail({
  to,
  groupName,
  inviterName,
  inviteUrl,
}: {
  to: string
  groupName: string
  inviterName: string
  inviteUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Você foi convidado para ${groupName} no Finnan`,
    html: emailWrapper(`
      <h2 style="color: #111; margin: 0 0 12px; font-size: 22px;">Você foi convidado!</h2>
      <p style="color: #555; line-height: 1.6; margin: 0 0 4px;">
        <strong style="color: #111;">${inviterName}</strong> te convidou para o grupo
        <strong style="color: #111;">${groupName}</strong> no Finnan.
      </p>
      <p style="color: #555; line-height: 1.6; margin: 8px 0 0;">
        Aceite o convite para começar a gerenciar finanças juntos:
      </p>
      ${emailButton(inviteUrl, 'Aceitar convite')}
      <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0;">
        Se não esperava esse email, pode ignorá-lo. O link expira em 7 dias.
      </p>
    `),
  })
}
