'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { getTransactions, deleteTransaction } from '@/actions/transactions'
import {
  Plus,
  Trash2,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Utensils,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  Shirt,
  Briefcase,
  BarChart3,
  Banknote,
  Tag,
  Repeat,
} from 'lucide-react'
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
  isRecurring: boolean
  recurrence: unknown
  category: { id: string; name: string; color: string | null } | null
  user: { id: string; name: string | null }
}

function getRecurrenceFrequency(recurrence: unknown): string | null {
  if (
    recurrence &&
    typeof recurrence === 'object' &&
    'frequency' in recurrence &&
    typeof (recurrence as { frequency: unknown }).frequency === 'string'
  ) {
    return (recurrence as { frequency: string }).frequency
  }
  return null
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
}

type Category = {
  id: string
  name: string
  type: string
  color: string | null
}

type Balance = {
  income: number
  expense: number
  balance: number
}

interface Props {
  groupId: string
  initialTransactions: Transaction[]
  initialCursor: string | null
  categories: Category[]
  currentMonth?: string
  currentType?: string
  currentCategoryId?: string
  balance: Balance
}

const CATEGORY_ICONS: Record<string, typeof Tag> = {
  'Alimentação': Utensils,
  'Transporte': Car,
  'Moradia': Home,
  'Saúde': Heart,
  'Educação': GraduationCap,
  'Lazer': Gamepad2,
  'Vestuário': Shirt,
  'Salário': Briefcase,
  'Freelance': Briefcase,
  'Investimentos': BarChart3,
  'Outros': Tag,
}

function getCategoryIcon(categoryName: string | undefined) {
  if (!categoryName) return Tag
  return CATEGORY_ICONS[categoryName] ?? Tag
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

function formatDateLong(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
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
  balance,
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
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie receitas e despesas do grupo
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/transactions/new">
            <Plus className="mr-2 size-4" />
            Nova transação
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Receitas</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-green-600/10 text-green-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <CardTitle className="text-base text-green-600 md:text-xl">
              {formatMoney(balance.income)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Despesas</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <TrendingDown className="size-4" />
              </div>
            </div>
            <CardTitle className="text-base text-red-500 md:text-xl">
              {formatMoney(balance.expense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Saldo</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
            </div>
            <CardTitle className={`text-base md:text-xl ${balance.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {formatMoney(balance.balance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
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

      {/* Transaction list */}
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
              {transactions.map((t) => {
                const IconComponent = getCategoryIcon(t.category?.name)
                const isIncome = t.type === 'income'

                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 md:gap-4 md:px-6"
                  >
                    {/* Category icon */}
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        isIncome
                          ? 'bg-green-600/10 text-green-600'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      <IconComponent className="size-5" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.description || 'Sem descrição'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDateLong(t.date)}
                        </span>
                        {t.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {t.category.name}
                          </Badge>
                        )}
                        {t.isRecurring && (() => {
                          const freq = getRecurrenceFrequency(t.recurrence)
                          return (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Repeat className="size-2.5" />
                              {(freq && RECURRENCE_LABELS[freq]) ?? 'Recorrente'}
                            </Badge>
                          )
                        })()}
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {t.user.name}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      className={`shrink-0 text-sm font-semibold ${
                        isIncome ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{' '}
                      {formatMoney(t.amount as number | string)}
                    </div>

                    {/* Delete */}
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
                )
              })}
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
