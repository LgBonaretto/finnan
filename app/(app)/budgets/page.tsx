import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getBudgets } from '@/actions/budgets'
import { BudgetManager } from '@/components/budget-manager'

interface Props {
  searchParams: Promise<{ month?: string }>
}

export default async function BudgetsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const params = await searchParams
  const now = new Date()
  const month =
    params.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const data = await getBudgets(groupId, month)

  return (
    <BudgetManager
      groupId={groupId}
      month={month}
      items={data.items}
      totalBudgeted={data.totalBudgeted}
      totalSpent={data.totalSpent}
    />
  )
}
