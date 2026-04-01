import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { canUseAI } from '@/lib/plan-limits'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limit: 1 call per group per day
const cache = new Map<string, { text: string; timestamp: number }>()
const ONE_DAY = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { groupId, month } = await req.json()
  if (!groupId || !month) {
    return NextResponse.json({ error: 'groupId e month são obrigatórios' }, { status: 400 })
  }

  // Check membership
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  })
  if (!member) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  // Plan check
  const aiAllowed = await canUseAI(groupId)
  if (!aiAllowed) {
    return NextResponse.json({
      insights: 'Insights com IA estão disponíveis nos planos Family e Group. Faça upgrade para desbloquear.',
    })
  }

  // Rate limit check
  const cacheKey = `${groupId}:${month}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < ONE_DAY) {
    return NextResponse.json({ insights: cached.text })
  }

  // Fetch data
  const start = new Date(month + '-01')
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { groupId, deletedAt: null, date: { gte: start, lt: end } },
      include: { category: { select: { name: true, type: true } } },
      orderBy: { amount: 'desc' },
      take: 50,
    }),
    prisma.budget.findMany({
      where: { groupId, month: start },
      include: { category: { select: { name: true } } },
    }),
  ])

  let totalIncome = 0
  let totalExpense = 0
  const byCategory: Record<string, number> = {}

  for (const t of transactions) {
    const amt = Number(t.amount)
    if (t.type === 'income') totalIncome += amt
    else totalExpense += amt
    const catName = t.category?.name ?? 'Sem categoria'
    if (t.type === 'expense') {
      byCategory[catName] = (byCategory[catName] ?? 0) + amt
    }
  }

  const budgetSummary = budgets.map((b) => {
    const spent = byCategory[b.category.name] ?? 0
    return `${b.category.name}: orçamento ${formatMoney(Number(b.amount))}, gasto ${formatMoney(spent)}`
  })

  const topExpenses = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, val]) => `${cat}: ${formatMoney(val)}`)

  // If no AI key, return mock insights
  if (!anthropic) {
    const mock = generateMockInsights(totalIncome, totalExpense, byCategory)
    cache.set(cacheKey, { text: mock, timestamp: Date.now() })
    return NextResponse.json({ insights: mock })
  }

  const prompt = `Analise os dados financeiros deste mês e dê uma análise breve (3-4 frases) em português do Brasil, com tom amigável e prático.

Receita total: ${formatMoney(totalIncome)}
Despesa total: ${formatMoney(totalExpense)}
Saldo: ${formatMoney(totalIncome - totalExpense)}

Maiores gastos por categoria:
${topExpenses.join('\n')}

${budgetSummary.length > 0 ? `Orçamentos:\n${budgetSummary.join('\n')}` : 'Nenhum orçamento definido.'}

Responda apenas com a análise, sem título ou marcadores.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Não foi possível gerar insights.'

    cache.set(cacheKey, { text, timestamp: Date.now() })
    return NextResponse.json({ insights: text })
  } catch {
    const mock = generateMockInsights(totalIncome, totalExpense, byCategory)
    return NextResponse.json({ insights: mock })
  }
}

function generateMockInsights(
  income: number,
  expense: number,
  byCategory: Record<string, number>,
) {
  const balance = income - expense
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]

  const parts: string[] = []

  if (income === 0 && expense === 0) {
    return 'Ainda não há transações registradas neste mês. Comece adicionando suas receitas e despesas para acompanhar suas finanças.'
  }

  if (balance >= 0) {
    parts.push(`Bom mês! Você teve um saldo positivo de ${formatMoney(balance)}.`)
  } else {
    parts.push(`Atenção: suas despesas superaram as receitas em ${formatMoney(Math.abs(balance))} neste mês.`)
  }

  if (topCat) {
    parts.push(`Sua maior categoria de gasto foi ${topCat[0]} com ${formatMoney(topCat[1])}.`)
  }

  if (expense > 0 && income > 0) {
    const ratio = Math.round((expense / income) * 100)
    parts.push(`Você gastou ${ratio}% da sua receita total.`)
  }

  return parts.join(' ')
}
