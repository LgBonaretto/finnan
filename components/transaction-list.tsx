'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { getTransactions, deleteTransaction } from '@/actions/transactions'
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Transaction = {
  id: string
  type: string
  amount: unknown
  description: string | null
  date: Date | string
  category: { id: string; name: string; color: string | null } | null
  user: { id: string; name: string | null }
}

type Category = {
  id: string
  name: string
  type: string
  color: string | null
}

interface Props {
  groupId: string
  initialTransactions: Transaction[]
  initialCursor: string | null
  categories: Category[]
  currentMonth?: string
  currentType?: string
  currentCategoryId?: string
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function TransactionList({
  groupId,
  initialTransactions,
  initialCursor,
  categories,
  currentMonth,
  currentType,
  currentCategoryId,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const months = buildMonthOptions()

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/transactions?${params.toString()}`)
  }

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      const result = await getTransactions({
        groupId,
        cursor,
        type: currentType as 'income' | 'expense' | undefined,
        categoryId: currentCategoryId,
        month: currentMonth,
      })
      setTransactions((prev) => [...prev, ...result.transactions])
      setCursor(result.nextCursor)
    })
  }

  async function handleDelete(id: string) {
    setIsDeleting(id)
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie receitas e despesas do grupo
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/transactions/new">Nova transação</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Select
          value={currentMonth ?? 'all'}
          onValueChange={(v) => updateFilter('month', v)}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentType ?? 'all'}
          onValueChange={(v) => updateFilter('type', v)}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentCategoryId ?? 'all'}
          onValueChange={(v) => updateFilter('categoryId', v)}
        >
          <SelectTrigger className="col-span-2 sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <ArrowLeftRight className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma transação</CardTitle>
            <CardDescription>
              Comece registrando sua primeira receita ou despesa.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/transactions/new">Criar transação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 md:gap-4 md:px-6"
                >
                  <div className="hidden w-12 shrink-0 text-sm text-muted-foreground sm:block">
                    {formatDate(t.date)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.description || 'Sem descrição'}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground sm:hidden">
                        {formatDate(t.date)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {t.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t.category.name}
                        </Badge>
                      )}
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {t.user.name}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-sm font-semibold ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{' '}
                    {formatMoney(t.amount as number | string)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={isDeleting === t.id}
                    className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 sm:block"
                    title="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>

          {cursor && (
            <div className="flex justify-center border-t border-border p-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Mobile FAB */}
      <Button
        asChild
        size="icon-lg"
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg sm:hidden"
      >
        <Link href="/transactions/new">
          <Plus className="size-6" />
        </Link>
      </Button>
    </div>
  )
}
