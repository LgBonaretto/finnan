import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getCategories } from '@/actions/transactions'
import { NewTransactionForm } from '@/components/new-transaction-form'

export default async function NewTransactionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const categories = await getCategories(groupId)

  return (
    <div className="mx-auto max-w-lg">
      <NewTransactionForm groupId={groupId} categories={categories} />
    </div>
  )
}
