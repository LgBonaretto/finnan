'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney, parseMoney } from '@/lib/money'
import { setBudget, deleteBudget } from '@/actions/budgets'
import { BudgetProgressBar } from '@/components/budget-progress-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type BudgetItem = {
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  budgetId: string | null
  limit: number
  spent: number
  percent: number | null
}

interface Props {
  groupId: string
  month: string
  items: BudgetItem[]
  totalBudgeted: number
  totalSpent: number
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

export function BudgetManager({
  groupId,
  month,
  items,
  totalBudgeted,
  totalSpent,
}: Props) {
  const router = useRouter()
  const months = buildMonthOptions()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalPercent =
    totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : null

  function handleMonthChange(value: string) {
    router.push(`/budgets?month=${value}`)
  }

  function startEdit(item: BudgetItem) {
    setEditingId(item.categoryId)
    setEditValue(
      item.limit > 0
        ? item.limit.toFixed(2).replace('.', ',')
        : '',
    )
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  function saveEdit(categoryId: string) {
    startTransition(async () => {
      try {
        const parsed = parseMoney(editValue)
        await setBudget(groupId, categoryId, month, parsed)
        setEditingId(null)
        router.refresh()
      } catch {
        // keep editing on invalid value
      }
    })
  }

  function handleDelete(budgetId: string) {
    startTransition(async () => {
      await deleteBudget(budgetId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground">
            Defina limites mensais por categoria
          </p>
        </div>
        <Select value={month} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Resumo do mês</CardDescription>
          <CardTitle className="text-xl">
            {formatMoney(totalSpent)}{' '}
            <span className="text-base font-normal text-muted-foreground">
              de {formatMoney(totalBudgeted)} orçados
            </span>
          </CardTitle>
          {totalBudgeted > 0 && (
            <div className="pt-1">
              <BudgetProgressBar
                spent={totalSpent}
                limit={totalBudgeted}
                percent={totalPercent}
              />
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.categoryId} size="sm">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm">
                {item.categoryIcon ?? item.categoryName.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.categoryName}
                </p>

                {editingId === item.categoryId ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="h-8 w-32"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(item.categoryId)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <Button
                      size="xs"
                      onClick={() => saveEdit(item.categoryId)}
                      disabled={isPending}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={cancelEdit}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : item.limit > 0 ? (
                  <div className="mt-1.5">
                    <BudgetProgressBar
                      spent={item.spent}
                      limit={item.limit}
                      percent={item.percent}
                    />
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatMoney(item.spent)} gasto &middot; Sem limite
                    definido
                  </p>
                )}
              </div>

              {editingId !== item.categoryId && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => startEdit(item)}
                  >
                    {item.limit > 0 ? 'Editar' : 'Definir'}
                  </Button>
                  {item.budgetId && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.budgetId!)}
                      disabled={isPending}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
