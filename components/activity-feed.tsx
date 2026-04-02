'use client'

import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/money'
import { getFeed } from '@/actions/feed'
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Banknote,
  ArrowLeftRight,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type FeedItem = {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  after: {
    type?: string
    amount?: string | number
    description?: string | null
    name?: string | null
    categoryName?: string | null
  } | null
  createdAt: Date | string
}

interface Props {
  groupId: string
  initialItems: FeedItem[]
  initialCursor: string | null
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
}

const ENTITY_ICONS: Record<string, typeof Activity> = {
  transaction: ArrowLeftRight,
  goal: Target,
  contribution: Banknote,
}

function getActionLabel(action: string, entityType: string): string {
  const entityLabels: Record<string, string> = {
    transaction: 'transação',
    goal: 'meta',
    budget: 'orçamento',
    contribution: 'contribuição',
    group: 'grupo',
    member: 'membro',
  }

  const actionLabels: Record<string, string> = {
    create: 'adicionou',
    update: 'editou',
    delete: 'removeu',
  }

  const a = actionLabels[action] ?? action
  const e = entityLabels[entityType] ?? entityType

  return `${a} ${e}`
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffHour < 24) return `há ${diffHour}h`
  if (diffDay < 7) return `há ${diffDay}d`

  return then.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function getAmountDisplay(item: FeedItem): string | null {
  if (!item.after?.amount) return null
  const amount = Number(item.after.amount)
  if (isNaN(amount) || amount === 0) return null

  const isExpense = item.after.type === 'expense'
  const prefix = isExpense ? '-' : '+'
  return `${prefix}${formatMoney(amount)}`
}

export function ActivityFeed({
  groupId,
  initialItems,
  initialCursor,
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, startTransition] = useTransition()

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      const result = await getFeed({ groupId, cursor })
      setItems((prev) => [...prev, ...result.items])
      setCursor(result.nextCursor)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Atividades
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o que acontece no grupo
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma atividade</CardTitle>
            <CardDescription>
              As ações do grupo aparecerão aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((item) => {
                const ActionIcon =
                  ACTION_ICONS[item.action] ?? Activity
                const EntityIcon =
                  ENTITY_ICONS[item.entityType] ?? ArrowLeftRight
                const amountDisplay = getAmountDisplay(item)
                const isExpense = item.after?.type === 'expense'

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 md:px-6"
                  >
                    <Avatar className="mt-0.5 size-9 shrink-0">
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(item.userName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {item.userName ?? 'Usuário'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {getActionLabel(item.action, item.entityType)}
                        </span>
                        {item.after?.description && (
                          <>
                            {' '}
                            <span className="font-medium">
                              &ldquo;{item.after.description}&rdquo;
                            </span>
                          </>
                        )}
                        {item.after?.name && (
                          <>
                            {' '}
                            <span className="font-medium">
                              &ldquo;{item.after.name}&rdquo;
                            </span>
                          </>
                        )}
                      </p>

                      <div className="mt-0.5 flex items-center gap-2">
                        {amountDisplay && (
                          <span
                            className={`text-xs font-semibold ${
                              isExpense ? 'text-red-500' : 'text-green-600'
                            }`}
                          >
                            {amountDisplay}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <EntityIcon className="size-4" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>

          {cursor && (
            <div className="flex justify-center border-t border-border p-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
