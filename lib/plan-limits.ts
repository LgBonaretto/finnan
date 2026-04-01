import { prisma } from '@/lib/prisma'

export type PlanId = 'free' | 'family' | 'group'

export interface PlanConfig {
  id: PlanId
  name: string
  description: string
  priceMonthly: number // centavos
  features: string[]
  limits: {
    members: number      // 0 = ilimitado
    transactionsPerMonth: number // 0 = ilimitado
    goals: number        // 0 = ilimitado
    aiInsights: boolean
  }
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Para começar a organizar suas finanças',
    priceMonthly: 0,
    features: [
      '1 membro',
      '50 transações/mês',
      '1 meta financeira',
      'Categorias padrão',
    ],
    limits: {
      members: 1,
      transactionsPerMonth: 50,
      goals: 1,
      aiInsights: false,
    },
  },
  family: {
    id: 'family',
    name: 'Family',
    description: 'Para famílias que querem controle financeiro',
    priceMonthly: 2990,
    features: [
      'Até 6 membros',
      'Transações ilimitadas',
      'Até 10 metas',
      'Insights com IA',
      'Orçamentos por categoria',
    ],
    limits: {
      members: 6,
      transactionsPerMonth: 0,
      goals: 10,
      aiInsights: true,
    },
  },
  group: {
    id: 'group',
    name: 'Group',
    description: 'Para grupos e organizações maiores',
    priceMonthly: 5990,
    features: [
      'Membros ilimitados',
      'Transações ilimitadas',
      'Metas ilimitadas',
      'Insights com IA',
      'Orçamentos por categoria',
      'Suporte prioritário',
    ],
    limits: {
      members: 0,
      transactionsPerMonth: 0,
      goals: 0,
      aiInsights: true,
    },
  },
}

export type LimitType = 'members' | 'transactionsPerMonth' | 'goals'

export async function checkPlanLimit(
  groupId: string,
  limitType: LimitType,
): Promise<{ allowed: boolean; message?: string }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { plan: true },
  })

  if (!group) return { allowed: false, message: 'Grupo não encontrado.' }

  const plan = PLANS[group.plan as PlanId] ?? PLANS.free
  const limit = plan.limits[limitType]

  // 0 means unlimited
  if (limit === 0) return { allowed: true }

  let currentCount: number

  switch (limitType) {
    case 'members': {
      currentCount = await prisma.groupMember.count({
        where: { groupId },
      })
      break
    }
    case 'transactionsPerMonth': {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      currentCount = await prisma.transaction.count({
        where: {
          groupId,
          deletedAt: null,
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      })
      break
    }
    case 'goals': {
      currentCount = await prisma.goal.count({
        where: { groupId, status: 'active' },
      })
      break
    }
  }

  if (currentCount >= limit) {
    const limitLabels: Record<LimitType, string> = {
      members: `O plano ${plan.name} permite no máximo ${limit} membro(s).`,
      transactionsPerMonth: `O plano ${plan.name} permite no máximo ${limit} transações por mês.`,
      goals: `O plano ${plan.name} permite no máximo ${limit} meta(s) ativa(s).`,
    }
    return {
      allowed: false,
      message: `${limitLabels[limitType]} Faça upgrade para continuar.`,
    }
  }

  return { allowed: true }
}

export async function canUseAI(groupId: string): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { plan: true },
  })
  if (!group) return false
  const plan = PLANS[group.plan as PlanId] ?? PLANS.free
  return plan.limits.aiInsights
}
