import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DashboardInsights } from '@/components/dashboard-insights'

async function getDashboardData(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  })

  const groupIds = memberships.map((m) => m.groupId)

  if (groupIds.length === 0) {
    return {
      monthIncome: 0,
      monthExpense: 0,
      balance: 0,
      groupCount: 0,
      recentTransactions: [],
      activeGoals: [],
      budgetAlerts: [],
      monthlyExpenses: [],
      groupId: null,
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Build last 6 months ranges
  const monthRanges: { label: string; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 1)
    const label = s.toLocaleDateString('pt-BR', { month: 'short' })
    monthRanges.push({ label: label.replace('.', ''), start: s, end: e })
  }

  const [
    monthIncomeResult,
    monthExpenseResult,
    totalIncomeResult,
    totalExpenseResult,
    recentTransactions,
    activeGoals,
    budgets,
    monthExpensesByCategory,
    last6MonthsExpenses,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { groupId: { in: groupIds }, type: 'income', deletedAt: null, date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId: { in: groupIds }, type: 'expense', deletedAt: null, date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId: { in: groupIds }, type: 'income', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId: { in: groupIds }, type: 'expense', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { groupId: { in: groupIds }, deletedAt: null },
      include: {
        category: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.goal.findMany({
      where: { groupId: { in: groupIds }, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.budget.findMany({
      where: { groupId: { in: groupIds }, month: monthStart },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { groupId: { in: groupIds }, type: 'expense', deletedAt: null, date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    // Expenses for last 6 months
    prisma.transaction.findMany({
      where: {
        groupId: { in: groupIds },
        type: 'expense',
        deletedAt: null,
        date: { gte: monthRanges[0].start, lt: monthRanges[5].end },
      },
      select: { date: true, amount: true },
    }),
  ])

  const monthIncome = Number(monthIncomeResult._sum.amount ?? 0)
  const monthExpense = Number(monthExpenseResult._sum.amount ?? 0)
  const totalIncome = Number(totalIncomeResult._sum.amount ?? 0)
  const totalExpense = Number(totalExpenseResult._sum.amount ?? 0)

  // Budget alerts (>80%)
  const spentByCategory = new Map(
    monthExpensesByCategory.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]),
  )

  const budgetAlerts = budgets
    .map((b) => {
      const spent = spentByCategory.get(b.categoryId) ?? 0
      const limit = Number(b.amount)
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0
      return { name: b.category.name, spent, limit, percent }
    })
    .filter((a) => a.percent > 80)
    .sort((a, b) => b.percent - a.percent)

  // Monthly chart data
  const monthlyExpenses = monthRanges.map((range) => {
    const total = last6MonthsExpenses
      .filter((t) => {
        const d = new Date(t.date)
        return d >= range.start && d < range.end
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { label: range.label, value: total }
  })

  return {
    monthIncome,
    monthExpense,
    balance: totalIncome - totalExpense,
    groupCount: groupIds.length,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      date: t.date,
      categoryName: t.category?.name ?? null,
      userName: t.user.name,
    })),
    activeGoals: activeGoals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      percent:
        Number(g.targetAmount) > 0
          ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)
          : 0,
    })),
    budgetAlerts,
    monthlyExpenses,
    groupId: groupIds[0],
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getDashboardData(session.user.id)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const summaryCards = [
    {
      title: 'Saldo total',
      value: formatMoney(data.balance),
      description: 'Receitas - Despesas (total)',
      icon: Scale,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      title: 'Receitas do mês',
      value: formatMoney(data.monthIncome),
      description: 'Entradas este mês',
      color: 'text-green-600',
      icon: TrendingUp,
      iconBg: 'bg-green-600/10 text-green-600',
    },
    {
      title: 'Despesas do mês',
      value: formatMoney(data.monthExpense),
      description: 'Saídas este mês',
      color: 'text-red-500',
      icon: TrendingDown,
      iconBg: 'bg-red-500/10 text-red-500',
    },
    {
      title: 'Grupos',
      value: String(data.groupCount),
      description: 'Grupos ativos',
      icon: Users,
      iconBg: 'bg-primary/10 text-primary',
    },
  ]

  const maxExpense = Math.max(...data.monthlyExpenses.map((m) => m.value), 1)

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Olá, {session.user.name?.split(' ')[0] ?? 'usuário'}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Veja o resumo das suas finanças
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">{card.title}</CardDescription>
                <div className={`flex size-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className="size-4" />
                </div>
              </div>
              <CardTitle className={`text-lg md:text-2xl ${card.color ?? 'text-foreground'}`}>
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {data.groupCount === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Primeiros passos</CardTitle>
            <CardDescription>
              Crie seu primeiro grupo para começar a organizar suas finanças em
              família ou com amigos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups/new">Criar grupo</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Budget alerts */}
          {data.budgetAlerts.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  <CardTitle className="text-base">Alertas de orçamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.budgetAlerts.map((alert) => (
                  <div
                    key={alert.name}
                    className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {alert.name}
                    </span>
                    <span className="text-xs font-medium text-destructive md:text-sm">
                      {formatMoney(alert.spent)} / {formatMoney(alert.limit)}{' '}
                      ({alert.percent}%)
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Expenses chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Despesas (últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-end gap-2">
                  {data.monthlyExpenses.map((m) => (
                    <div
                      key={m.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {m.value > 0 ? formatMoney(m.value) : ''}
                      </span>
                      <div
                        className="w-full rounded-t-sm bg-primary transition-all"
                        style={{
                          height: `${Math.max((m.value / maxExpense) * 100, 2)}%`,
                          minHeight: m.value > 0 ? '4px' : '2px',
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            {data.groupId && (
              <DashboardInsights groupId={data.groupId} month={currentMonth} />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Últimas transações</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/transactions">Ver todas</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.recentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma transação registrada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {t.description || 'Sem descrição'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.date)}
                            {t.categoryName && ` · ${t.categoryName}`}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            t.type === 'income'
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'}{' '}
                          {formatMoney(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active goals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Metas ativas</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/goals">Ver todas</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.activeGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma meta ativa.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.activeGoals.map((g) => (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">
                            {g.name}
                          </span>
                          <span className="text-muted-foreground">
                            {g.percent}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${
                              g.percent >= 100
                                ? 'bg-green-500'
                                : 'bg-primary'
                            }`}
                            style={{
                              width: `${Math.min(g.percent, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(g.currentAmount)} de{' '}
                          {formatMoney(g.targetAmount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
