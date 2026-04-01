import { auth } from '@/lib/auth'
import { getInviteInfo } from '@/actions/members'
import { InviteClient } from './invite-client'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invite = await getInviteInfo(token)

  if (!invite) {
    return <InviteClient token={token} status="not-found" />
  }

  if (invite.expired) {
    const message =
      invite.reason === 'used'
        ? 'Este convite já foi utilizado.'
        : invite.reason === 'declined'
          ? 'Este convite foi recusado.'
          : 'Este convite expirou.'
    return <InviteClient token={token} status="expired" message={message} />
  }

  // If user is logged in, show accept/decline UI directly
  const session = await auth()

  return (
    <InviteClient
      token={token}
      status="valid"
      groupName={invite.groupName!}
      inviterName={invite.inviterName!}
      role={invite.role!}
      isLoggedIn={!!session?.user}
    />
  )
}
