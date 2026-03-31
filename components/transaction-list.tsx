'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { getTransactions, deleteTransaction } from '@/actions/transactions'
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
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie receitas e despesas do grupo
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">Nova transação</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={currentMonth ?? 'all'}
          onValueChange={(v) => updateFilter('month', v)}
        >
          <SelectTrigger className="w-48">
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
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-44">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M17 3L21 7L17 11" />
                <path d="M3 7H21" />
                <path d="M7 21L3 17L7 13" />
                <path d="M21 17H3" />
              </svg>
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
                  className="flex items-center gap-4 px-6 py-3"
                >
                  <div className="w-12 shrink-0 text-sm text-muted-foreground">
                    {formatDate(t.date)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center gap-2">
                      {t.category && (
                        <Badge variant="secondary" className="text-xs">
                          {t.category.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
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
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Excluir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
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
    </div>
  )
}
