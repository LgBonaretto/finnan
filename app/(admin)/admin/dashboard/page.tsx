import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/money'
import { PLANS, type PlanId } from '@/lib/plan-limits'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

async function getAdminMetrics() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)

  const [
    totalUsers,
    totalGroups,
    planCounts,
    recentUsers,
    recentGroups,
    dailySignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.group.groupBy({
      by: ['plan'],
      _count: true,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { members: true, transactions: true } } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // MRR calculation
  const mrr = planCounts.reduce((sum, pc) => {
    const plan = PLANS[pc.plan as PlanId]
    return sum + (plan ? plan.priceMonthly * pc._count : 0)
  }, 0)

  // Most popular plan
  const topPlan = planCounts.sort((a, b) => b._count - a._count)[0]

  // Daily signups for chart
  const days: { label: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    const count = dailySignups.filter(
      (u) => u.createdAt >= d && u.createdAt < next,
    ).length
    days.push({
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      count,
    })
  }

  return {
    totalUsers,
    totalGroups,
    mrr,
    topPlan: topPlan ? (PLANS[topPlan.plan as PlanId]?.name ?? topPlan.plan) : 'N/A',
    recentUsers,
    recentGroups,
    dailySignups: days,
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function AdminDashboardPage() {
  const data = await getAdminMetrics()
  const maxSignups = Math.max(...data.dailySignups.map((d) => d.count), 1)

  const cards = [
    { title: 'Total de usuários', value: String(data.totalUsers) },
    { title: 'Grupos ativos', value: String(data.totalGroups) },
    { title: 'MRR estimado', value: formatMoney(data.mrr / 100) },
    { title: 'Plano mais usado', value: data.topPlan },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardDescription>{c.title}</CardDescription>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novos cadastros (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-px">
            {data.dailySignups.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t-sm bg-primary transition-all"
                  style={{
                    height: `${Math.max((d.count / maxSignups) * 100, 2)}%`,
                    minHeight: d.count > 0 ? '4px' : '2px',
                  }}
                  title={`${d.label}: ${d.count}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{data.dailySignups[0]?.label}</span>
            <span>{data.dailySignups[data.dailySignups.length - 1]?.label}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grupos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentGroups.map((g) => (
                <div key={g.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g._count.members} membros · {g._count.transactions} transações
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{g.plan}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(g.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
