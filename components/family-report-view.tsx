'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { exportFamilyReportCSV } from '@/actions/family-report'
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

type ChildReport = {
  userId: string
  name: string
  email: string | null
  totalSpent: number
  previousMonthSpent: number
  variation: number | null
  topCategories: { name: string; total: number; count: number }[]
  recentTransactions: {
    id: string
    description: string | null
    amount: number
    date: Date | string
    categoryName: string | null
    type: string
  }[]
}

interface Props {
  groupId: string
  month: string
  children: ChildReport[]
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export function FamilyReportView({ groupId, month, children }: Props) {
  const router = useRouter()
  const [isExporting, startExport] = useTransition()
  const months = buildMonthOptions()

  function handleMonthChange(value: string) {
    router.push(`/family-report?month=${value}`)
  }

  function handleExport() {
    startExport(async () => {
      const csv = await exportFamilyReportCSV(groupId, month)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tukkan-familia-${month}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Relatório Família
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os gastos dos dependentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-48">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || children.length === 0}
          >
            <Download className="mr-2 size-4" />
            {isExporting ? 'Exportando...' : 'CSV'}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {children.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum dependente</CardTitle>
            <CardDescription>
              Adicione membros com papel &ldquo;Dependente&rdquo; ao grupo para
              ver o relatório.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {children.map((child) => (
            <Card key={child.userId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback
                        className={`text-sm font-bold text-white ${getAvatarColor(child.name)}`}
                      >
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{child.name}</CardTitle>
                      {child.email && (
                        <CardDescription className="text-xs">
                          {child.email}
                        </CardDescription>
                      )}
                    </div>
                  </div>

                  {/* Variation badge */}
                  {child.variation !== null && (
                    <Badge
                      variant="outline"
                      className={
                        child.variation > 0
                          ? 'border-red-500/30 bg-red-500/10 text-red-500'
                          : child.variation < 0
                            ? 'border-green-500/30 bg-green-500/10 text-green-500'
                            : 'border-border text-muted-foreground'
                      }
                    >
                      {child.variation > 0 ? (
                        <TrendingUp className="mr-1 size-3" />
                      ) : child.variation < 0 ? (
                        <TrendingDown className="mr-1 size-3" />
                      ) : (
                        <Minus className="mr-1 size-3" />
                      )}
                      {child.variation > 0 ? '+' : ''}
                      {child.variation}% vs mês anterior
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">
                      Total gasto este mês
                    </p>
                    <p className="text-lg font-bold text-red-500">
                      {formatMoney(child.totalSpent)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">
                      Mês anterior
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {formatMoney(child.previousMonthSpent)}
                    </p>
                  </div>
                </div>

                {/* Top categories */}
                {child.topCategories.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Categorias mais usadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {child.topCategories.map((cat) => (
                        <Badge key={cat.name} variant="secondary">
                          {cat.name} &middot; {formatMoney(cat.total)} (
                          {cat.count}x)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent transactions */}
                {child.recentTransactions.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Últimas transações
                    </p>
                    <div className="space-y-2">
                      {child.recentTransactions.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {t.description || 'Sem descrição'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(t.date)}
                              {t.categoryName && ` · ${t.categoryName}`}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-red-500">
                            -{formatMoney(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {child.recentTransactions.length === 0 &&
                  child.topCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma transação neste mês.
                    </p>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
