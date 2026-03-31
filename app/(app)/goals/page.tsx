import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getGoals } from '@/actions/goals'
import { GoalsList } from '@/components/goals-list'

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const goals = await getGoals(groupId)

  return <GoalsList groupId={groupId} initialGoals={goals} />
}
