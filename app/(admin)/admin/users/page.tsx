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
  searchParams: Promise<{ search?: string; page?: string }>
}

const PAGE_SIZE = 20

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {}
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { groupMembers: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>

      <form className="flex gap-3">
        <Input name="search" placeholder="Buscar por nome ou email..." defaultValue={params.search} className="w-72" />
        <Button type="submit" variant="secondary" size="sm">Buscar</Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} usuário(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Grupos</th>
                  <th className="px-4 py-2 font-medium">Criado em</th>
                  <th className="px-4 py-2 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">{u.name ?? 'Sem nome'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2.5">
                      {u.role === 'SUPERADMIN' ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u._count.groupMembers}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.updatedAt)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
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
              <Link href={`/admin/users?page=${page - 1}${params.search ? `&search=${params.search}` : ''}`}>Anterior</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/users?page=${page + 1}${params.search ? `&search=${params.search}` : ''}`}>Próxima</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
