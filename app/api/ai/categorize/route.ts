import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { description, groupId, type } = await req.json()
  if (!description || !groupId) {
    return NextResponse.json({ error: 'description e groupId são obrigatórios' }, { status: 400 })
  }

  const categories = await prisma.category.findMany({
    where: { groupId, ...(type ? { type } : {}) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  if (categories.length === 0) {
    return NextResponse.json({ categoryId: null })
  }

  // If no AI key, use keyword matching
  if (!anthropic) {
    const match = keywordMatch(description, categories)
    return NextResponse.json({ categoryId: match })
  }

  const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Dado a descrição de uma transação financeira, retorne APENAS o id da categoria mais adequada. Sem explicação, apenas o id.

Descrição: "${description}"

Categorias disponíveis:
${categoryList}

Responda apenas com o id.`,
        },
      ],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : null

    const found = categories.find((c) => text?.includes(c.id))
    return NextResponse.json({ categoryId: found?.id ?? null })
  } catch {
    const match = keywordMatch(description, categories)
    return NextResponse.json({ categoryId: match })
  }
}

function keywordMatch(
  description: string,
  categories: { id: string; name: string }[],
): string | null {
  const desc = description.toLowerCase()

  const keywords: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'restaurante', 'lanche', 'comida', 'padaria', 'açougue', 'ifood', 'uber eats', 'pizza', 'café'],
    'Transporte': ['uber', 'gasolina', 'combustível', 'estacionamento', 'ônibus', 'metrô', 'pedágio', '99', 'táxi', 'passagem'],
    'Moradia': ['aluguel', 'condomínio', 'luz', 'energia', 'água', 'internet', 'gás', 'iptu'],
    'Saúde': ['farmácia', 'médico', 'consulta', 'exame', 'plano de saúde', 'hospital', 'dentista', 'remédio'],
    'Educação': ['escola', 'faculdade', 'curso', 'livro', 'material escolar', 'mensalidade'],
    'Lazer': ['cinema', 'netflix', 'spotify', 'viagem', 'show', 'teatro', 'jogo', 'streaming', 'bar'],
    'Vestuário': ['roupa', 'sapato', 'tênis', 'loja', 'shopping', 'camisa', 'calça'],
    'Salário': ['salário', 'salario', 'pagamento', 'holerite', 'remuneração'],
    'Freelance': ['freelance', 'freela', 'projeto', 'consultoria', 'serviço prestado'],
    'Investimentos': ['dividendo', 'rendimento', 'juros', 'investimento', 'ação', 'fundo'],
  }

  for (const [catName, words] of Object.entries(keywords)) {
    if (words.some((w) => desc.includes(w))) {
      const found = categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      )
      if (found) return found.id
    }
  }

  return null
}
