import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  searchParams: Promise<{ plan?: string; search?: string; page?: string }>
}

const PAGE_SIZE = 20

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const planColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'secondary',
  family: 'default',
  group: 'outline',
}

export default async function AdminGroupsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {}
  if (params.plan && params.plan !== 'all') where.plan = params.plan
  if (params.search) where.name = { contains: params.search, mode: 'insensitive' }

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      include: { _count: { select: { members: true, transactions: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.group.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Grupos</h1>

      <form className="flex flex-wrap gap-3">
        <Input name="search" placeholder="Buscar por nome..." defaultValue={params.search} className="w-64" />
        <select
          name="plan"
          defaultValue={params.plan ?? 'all'}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os planos</option>
          <option value="free">Free</option>
          <option value="family">Family</option>
          <option value="group">Group</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} grupo(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Plano</th>
                  <th className="px-4 py-2 font-medium">Membros</th>
                  <th className="px-4 py-2 font-medium">Transações</th>
                  <th className="px-4 py-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">{g.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{g.type === 'family' ? 'Família' : 'Grupo'}</td>
                    <td className="px-4 py-2.5"><Badge variant={planColors[g.plan] ?? 'secondary'}>{g.plan}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{g._count.members}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{g._count.transactions}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(g.createdAt)}</td>
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum grupo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/groups?page=${page - 1}${params.plan ? `&plan=${params.plan}` : ''}${params.search ? `&search=${params.search}` : ''}`}>Anterior</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/groups?page=${page + 1}${params.plan ? `&plan=${params.plan}` : ''}${params.search ? `&search=${params.search}` : ''}`}>Próxima</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
