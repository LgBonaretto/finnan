'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { formatMoney } from '@/lib/money'
import { getFeed } from '@/actions/feed'
import type { FeedItem } from '@/actions/feed'
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Banknote,
  ArrowLeftRight,
  Activity,
  Wallet,
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

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
]

function getAvatarColor(name?: string | null): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Activity }> = {
  added_expense: { label: 'adicionou despesa', icon: ArrowLeftRight },
  added_income: { label: 'adicionou receita', icon: Banknote },
  created_goal: { label: 'criou meta', icon: Target },
  contributed_goal: { label: 'contribuiu para meta', icon: Target },
  set_budget: { label: 'definiu orçamento', icon: Wallet },
  created_mission: { label: 'criou missão', icon: Target },
  completed_mission: { label: 'completou missão', icon: Target },
}

function getActionLabel(action: string): string {
  return ACTION_CONFIG[action]?.label ?? action
}

function getActionIcon(action: string) {
  return ACTION_CONFIG[action]?.icon ?? Activity
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

export function ActivityFeed({
  groupId,
  initialItems,
  initialCursor,
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, startTransition] = useTransition()

  // Auto-refresh every 30s
  const refresh = useCallback(async () => {
    try {
      const result = await getFeed({ groupId, limit: 20 })
      setItems(result.items)
      setCursor(result.nextCursor)
    } catch {
      // silently fail
    }
  }, [groupId])

  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

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
                const IconComponent = getActionIcon(item.action)
                const isExpense = item.action === 'added_expense'

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 md:px-6"
                  >
                    <Avatar className="mt-0.5 size-9 shrink-0">
                      <AvatarFallback
                        className={`text-xs font-medium text-white ${getAvatarColor(item.userName)}`}
                      >
                        {getInitials(item.userName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {item.userName ?? 'Usuário'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {getActionLabel(item.action)}
                        </span>
                        {item.description && (
                          <>
                            {' '}
                            <span className="font-medium">
                              &ldquo;{item.description}&rdquo;
                            </span>
                          </>
                        )}
                      </p>

                      <div className="mt-0.5 flex items-center gap-2">
                        {item.amount !== null && item.amount > 0 && (
                          <span
                            className={`text-xs font-semibold ${
                              isExpense ? 'text-red-500' : 'text-green-600'
                            }`}
                          >
                            {isExpense ? '-' : '+'}
                            {formatMoney(item.amount)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <IconComponent className="size-4" />
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
