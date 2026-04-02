'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { exportTransactionsCSV } from '@/actions/reports'
import type { ReportData } from '@/actions/reports'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  BarChart3,
  Download,
  Trophy,
  Calendar,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface Props {
  groupId: string
  year: number
  data: ReportData
}

const PIE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-indigo-500',
]

function buildYearOptions() {
  const now = new Date().getFullYear()
  const options: { value: string; label: string }[] = []
  for (let y = now; y >= now - 4; y--) {
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

export function ReportsView({ groupId, year, data }: Props) {
  const router = useRouter()
  const [isExporting, startExport] = useTransition()
  const years = buildYearOptions()

  const maxBar = Math.max(
    ...data.monthlyComparison.map((m) => Math.max(m.income, m.expense)),
    1,
  )

  function handleYearChange(value: string) {
    router.push(`/reports?year=${value}`)
  }

  function handleExport() {
    startExport(async () => {
      const csv = await exportTransactionsCSV(groupId, year)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tukkan-transacoes-${year}.csv`
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
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise financeira detalhada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 size-4" />
            {isExporting ? 'Exportando...' : 'CSV'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Receitas</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-green-600/10 text-green-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <CardTitle className="text-base text-green-600 md:text-xl">
              {formatMoney(data.summary.totalIncome)}
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
              {formatMoney(data.summary.totalExpense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Saldo</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Scale className="size-4" />
              </div>
            </div>
            <CardTitle
              className={`text-base md:text-xl ${data.summary.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}
            >
              {formatMoney(data.summary.balance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Transações</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Hash className="size-4" />
              </div>
            </div>
            <CardTitle className="text-base text-foreground md:text-xl">
              {data.summary.transactionCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maior gasto</p>
              <p className="text-sm font-semibold text-foreground">
                {data.summary.topCategory ?? 'N/A'}
              </p>
              {data.summary.topCategoryAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(data.summary.topCategoryAmount)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média diária</p>
              <p className="text-sm font-semibold text-foreground">
                {formatMoney(data.summary.averageDailyExpense)}
              </p>
              <p className="text-xs text-muted-foreground">em despesas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-600/10 text-green-600">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoria líder</p>
              <p className="text-sm font-semibold text-foreground">
                {data.categoryBreakdown[0]?.categoryName ?? 'N/A'}
              </p>
              {data.categoryBreakdown[0] && (
                <p className="text-xs text-muted-foreground">
                  {data.categoryBreakdown[0].percent}% das despesas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expense bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita vs Despesa</CardTitle>
            <CardDescription>Comparação mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-52 items-end gap-1.5">
              {data.monthlyComparison.map((m) => (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex w-full items-end justify-center gap-0.5">
                    <div
                      className="w-[45%] rounded-t-sm bg-green-500 transition-all"
                      style={{
                        height: `${Math.max((m.income / maxBar) * 160, m.income > 0 ? 4 : 2)}px`,
                      }}
                    />
                    <div
                      className="w-[45%] rounded-t-sm bg-red-500 transition-all"
                      style={{
                        height: `${Math.max((m.expense / maxBar) * 160, m.expense > 0 ? 4 : 2)}px`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-green-500" />
                Receita
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-red-500" />
                Despesa
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
            <CardDescription>Distribuição proporcional</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa registrada.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Visual bar representation */}
                <div className="flex h-6 overflow-hidden rounded-full">
                  {data.categoryBreakdown.map((cat, i) => (
                    <div
                      key={cat.categoryId ?? '__none'}
                      className={`${PIE_COLORS[i % PIE_COLORS.length]} transition-all`}
                      style={{ width: `${cat.percent}%` }}
                      title={`${cat.categoryName}: ${cat.percent}%`}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {data.categoryBreakdown.slice(0, 8).map((cat, i) => (
                    <div
                      key={cat.categoryId ?? '__none'}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-3 rounded-sm ${PIE_COLORS[i % PIE_COLORS.length]}`}
                        />
                        <span className="text-sm text-foreground">
                          {cat.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {cat.percent}%
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {formatMoney(cat.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
