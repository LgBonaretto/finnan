import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { GroupsClient } from '@/components/groups-page'

export default async function GroupsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()

  return <GroupsClient groups={groups} />
}
