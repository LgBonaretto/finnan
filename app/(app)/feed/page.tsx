import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getFeed } from '@/actions/feed'
import { ActivityFeed } from '@/components/activity-feed'

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const { items, nextCursor } = await getFeed({ groupId })

  return (
    <ActivityFeed
      groupId={groupId}
      initialItems={items}
      initialCursor={nextCursor}
    />
  )
}
