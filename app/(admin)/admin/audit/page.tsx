import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  searchParams: Promise<{
    action?: string
    page?: string
  }>
}

const PAGE_SIZE = 30

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  plan_upgrade: 'Upgrade',
  plan_downgrade: 'Downgrade',
  payment_succeeded: 'Pagamento OK',
  payment_failed: 'Pagamento falhou',
}

const actionVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  plan_upgrade: 'default',
  plan_downgrade: 'destructive',
  payment_succeeded: 'default',
  payment_failed: 'destructive',
}

export default async function AdminAuditPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {}
  if (params.action && params.action !== 'all') where.action = params.action

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        group: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>

      <form className="flex gap-3">
        <select
          name="action"
          defaultValue={params.action ?? 'all'}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todas as ações</option>
          <option value="create">Criação</option>
          <option value="update">Atualização</option>
          <option value="delete">Exclusão</option>
          <option value="plan_upgrade">Upgrade</option>
          <option value="plan_downgrade">Downgrade</option>
          <option value="payment_succeeded">Pagamento OK</option>
          <option value="payment_failed">Pagamento falhou</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} registro(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Usuário</th>
                  <th className="px-4 py-2 font-medium">Ação</th>
                  <th className="px-4 py-2 font-medium">Entidade</th>
                  <th className="px-4 py-2 font-medium">Grupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {log.user?.name ?? log.user?.email ?? 'Sistema'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={actionVariants[log.action] ?? 'secondary'}>
                        {actionLabels[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.entityType}
                      {log.entityId && (
                        <span className="ml-1 text-xs text-muted-foreground/60">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.group?.name ?? '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum log encontrado.
                    </td>
                  </tr>
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
              <Link
                href={`/admin/audit?page=${page - 1}${params.action ? `&action=${params.action}` : ''}`}
              >
                Anterior
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/admin/audit?page=${page + 1}${params.action ? `&action=${params.action}` : ''}`}
              >
                Próxima
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
