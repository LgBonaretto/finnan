import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getCategories } from '@/actions/transactions'
import { NewTransactionForm } from '@/components/new-transaction-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function NewTransactionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const categories = await getCategories(groupId)

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/transactions">
          <ArrowLeft className="mr-2 size-4" />
          Voltar para transações
        </Link>
      </Button>
      <NewTransactionForm groupId={groupId} categories={categories} />
    </div>
  )
}
