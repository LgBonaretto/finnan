import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getMembers } from '@/actions/members'
import {
  getAllowances,
  getPendingRequests,
  getMyAllowance,
  getMyRequests,
} from '@/actions/allowances'
import { AllowancesPage } from '@/components/allowances-page'

export default async function AllowancesRoute() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const group = groups[0]
  const groupId = group.id
  const role = group.role

  const isAdmin = role === 'owner' || role === 'admin'

  // Load data based on role
  const [allowances, pendingRequests, membersRaw, myAllowance] = await Promise.all([
    isAdmin ? getAllowances(groupId) : Promise.resolve([]),
    isAdmin ? getPendingRequests(groupId) : Promise.resolve([]),
    isAdmin ? getMembers(groupId) : Promise.resolve([]),
    !isAdmin ? getMyAllowance(groupId) : Promise.resolve(null),
  ])

  const myRequests = !isAdmin && myAllowance
    ? await getMyRequests(myAllowance.id)
    : []

  const members = membersRaw.map((m) => ({
    userId: m.userId,
    userName: m.user.name ?? 'Sem nome',
    role: m.role,
  }))

  return (
    <AllowancesPage
      role={role}
      groupId={groupId}
      allowances={allowances}
      pendingRequests={pendingRequests}
      members={members}
      myAllowance={myAllowance}
      myRequests={myRequests}
    />
  )
}
