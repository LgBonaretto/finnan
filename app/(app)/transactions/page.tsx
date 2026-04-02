import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getTransactions, getCategories, getBalance } from '@/actions/transactions'
import { TransactionList } from '@/components/transaction-list'

interface Props {
  searchParams: Promise<{
    month?: string
    type?: string
    categoryId?: string
  }>
}

export default async function TransactionsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const params = await searchParams

  const [{ transactions, nextCursor }, categories, balance] = await Promise.all([
    getTransactions({
      groupId,
      type: params.type as 'income' | 'expense' | undefined,
      categoryId: params.categoryId,
      month: params.month,
    }),
    getCategories(groupId),
    getBalance(groupId, params.month),
  ])

  return (
    <TransactionList
      groupId={groupId}
      initialTransactions={transactions}
      initialCursor={nextCursor}
      categories={categories}
      currentMonth={params.month}
      currentType={params.type}
      currentCategoryId={params.categoryId}
      balance={balance}
    />
  )
}
