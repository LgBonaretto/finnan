import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getMissions } from '@/actions/missions'
import { getCategories } from '@/actions/transactions'
import { MissionsView } from '@/components/missions-view'

export default async function MissionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const group = groups[0]
  const [missions, categories] = await Promise.all([
    getMissions(group.id),
    getCategories(group.id),
  ])

  return (
    <MissionsView
      groupId={group.id}
      userRole={group.role}
      initialMissions={missions}
      categories={categories}
    />
  )
}
