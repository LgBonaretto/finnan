import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGroups } from '@/actions/groups'
import { getMembers } from '@/actions/members'
import { SettingsTabs } from '@/components/settings-tabs'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  })

  if (!user) redirect('/login')

  const groups = await getGroups()
  const group = groups[0] ?? null

  let members: Awaited<ReturnType<typeof getMembers>> = []
  let userRole: string | null = null

  if (group) {
    members = await getMembers(group.id)
    userRole = group.role
  }

  return (
    <SettingsTabs
      user={{ id: user.id, name: user.name ?? '', email: user.email ?? '' }}
      group={group ? { id: group.id, name: group.name } : null}
      members={members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
      }))}
      userRole={userRole}
    />
  )
}
