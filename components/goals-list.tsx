'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney, parseMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  createGoal,
  addContribution,
  updateGoalStatus,
  deleteGoal,
} from '@/actions/goals'
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Trash2,
  XCircle,
  Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Goal = {
  id: string
  name: string
  description: string | null
  targetAmount: number
  currentAmount: number
  targetDate: Date | string | null
  status: string
  createdBy: { id: string; name: string | null }
  contributionCount: number
  percent: number
}

interface Props {
  groupId: string
  initialGoals: Goal[]
}

type GoalDisplayStatus = 'active' | 'completed' | 'cancelled' | 'overdue'

const statusConfig: Record<
  GoalDisplayStatus,
  { label: string; className: string; dotColor: string }
> = {
  active: {
    label: 'Em andamento',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
    dotColor: 'bg-blue-500',
  },
  completed: {
    label: 'Concluída',
    className: 'border-green-500/30 bg-green-500/10 text-green-500',
    dotColor: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-red-500/30 bg-red-500/10 text-red-500',
    dotColor: 'bg-red-500',
  },
  overdue: {
    label: 'Atrasada',
    className: 'border-red-500/30 bg-red-500/10 text-red-500',
    dotColor: 'bg-red-500',
  },
}

function getDisplayStatus(goal: Goal): GoalDisplayStatus {
  if (goal.status === 'completed') return 'completed'
  if (goal.status === 'cancelled') return 'cancelled'
  if (
    goal.status === 'active' &&
    goal.targetDate &&
    new Date(goal.targetDate) < new Date() &&
    goal.percent < 100
  ) {
    return 'overdue'
  }
  return 'active'
}

function GoalProgressBar({
  percent,
  displayStatus,
}: {
  percent: number
  displayStatus: GoalDisplayStatus
}) {
  const clamped = Math.min(percent, 100)

  const barColor =
    displayStatus === 'completed' || percent >= 100
      ? 'bg-green-500'
      : displayStatus === 'overdue'
        ? 'bg-red-500'
        : 'bg-blue-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{percent}%</span>
        <span className="text-muted-foreground">concluído</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

function formatDate(date: Date | string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(date: Date | string | null) {
  if (!date) return false
  return new Date(date) < new Date()
}

// ── New Goal Dialog ──────────────────────────────────────────────────────────

function NewGoalDialog({
  groupId,
  onCreated,
  trigger,
}: {
  groupId: string
  onCreated: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')

  function reset() {
    setName('')
    setDescription('')
    setTargetAmount('')
    setTargetDate('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Informe o nome.')
      return
    }
    if (!targetAmount.trim()) {
      setError('Informe o valor alvo.')
      return
    }

    let parsed: string
    try {
      parsed = parseMoney(targetAmount)
    } catch {
      setError('Valor inválido.')
      return
    }
    if (Number(parsed) <= 0) {
      setError('O valor deve ser maior que zero.')
      return
    }

    startTransition(async () => {
      try {
        await createGoal({
          groupId,
          name: name.trim(),
          description: description.trim() || undefined,
          targetAmount: parsed,
          targetDate: targetDate || undefined,
        })
        reset()
        setOpen(false)
        onCreated()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar meta.')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 size-4" />
            Nova meta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar nova meta</DialogTitle>
            <DialogDescription>
              Defina um objetivo financeiro para o grupo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="goal-name">Nome</Label>
              <Input
                id="goal-name"
                placeholder="Ex: Viagem de férias"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-desc">Descrição (opcional)</Label>
              <Input
                id="goal-desc"
                placeholder="Detalhes da meta"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-amount">Valor alvo (R$)</Label>
              <Input
                id="goal-amount"
                placeholder="5.000,00"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-date">Data limite (opcional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Contribute Dialog ────────────────────────────────────────────────────────

function ContributeDialog({
  goalId,
  goalName,
  onContributed,
}: {
  goalId: string
  goalName: string
  onContributed: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  function reset() {
    setAmount('')
    setNote('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!amount.trim()) {
      setError('Informe o valor.')
      return
    }

    let parsed: string
    try {
      parsed = parseMoney(amount)
    } catch {
      setError('Valor inválido.')
      return
    }
    if (Number(parsed) <= 0) {
      setError('O valor deve ser maior que zero.')
      return
    }

    startTransition(async () => {
      try {
        await addContribution(goalId, parsed, note.trim() || undefined)
        reset()
        setOpen(false)
        onContributed()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao contribuir.')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Banknote className="mr-1.5 size-4" />
          Adicionar valor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Contribuir para &ldquo;{goalName}&rdquo;
            </DialogTitle>
            <DialogDescription>Adicione um valor à meta</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contrib-amount">Valor (R$)</Label>
              <Input
                id="contrib-amount"
                placeholder="100,00"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrib-note">Observação (opcional)</Label>
              <Input
                id="contrib-note"
                placeholder="Ex: Parte do salário"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main List ────────────────────────────────────────────────────────────────

export function GoalsList({ groupId, initialGoals }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function refresh() {
    router.refresh()
  }

  function handleStatusChange(
    goalId: string,
    status: 'completed' | 'cancelled',
  ) {
    startTransition(async () => {
      await updateGoalStatus(goalId, status)
      router.refresh()
    })
  }

  function handleDelete(goalId: string) {
    startTransition(async () => {
      await deleteGoal(goalId)
      router.refresh()
    })
  }

  const activeGoals = initialGoals.filter((g) => g.status === 'active')
  const completedGoals = initialGoals.filter((g) => g.status !== 'active')
  const totalSaved = initialGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  const totalTarget = initialGoals.reduce((sum, g) => sum + g.targetAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus objetivos financeiros
          </p>
        </div>
        <NewGoalDialog groupId={groupId} onCreated={refresh} />
      </div>

      {/* Summary cards */}
      {initialGoals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">
                  Metas ativas
                </CardDescription>
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Target className="size-4" />
                </div>
              </div>
              <CardTitle className="text-base text-foreground md:text-xl">
                {activeGoals.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">
                  Total guardado
                </CardDescription>
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-600/10 text-green-600">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <CardTitle className="text-base text-green-600 md:text-xl">
                {formatMoney(totalSaved)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">
                  Progresso geral
                </CardDescription>
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target className="size-4" />
                </div>
              </div>
              <CardTitle className="text-base text-foreground md:text-xl">
                {totalTarget > 0
                  ? Math.round((totalSaved / totalTarget) * 100)
                  : 0}
                %
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {initialGoals.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Target className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma meta criada</CardTitle>
            <CardDescription>
              Defina objetivos financeiros para acompanhar o progresso do grupo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <NewGoalDialog groupId={groupId} onCreated={refresh} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeGoals.map((goal) => {
                const displayStatus = getDisplayStatus(goal)
                const cfg = statusConfig[displayStatus]

                return (
                  <Card
                    key={goal.id}
                    className="transition-colors hover:border-foreground/10"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                            <Target className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-base">
                              {goal.name}
                            </CardTitle>
                            {goal.description && (
                              <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                                {goal.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 border', cfg.className)}
                        >
                          <span
                            className={cn(
                              'mr-1.5 inline-block size-1.5 rounded-full',
                              cfg.dotColor,
                            )}
                          />
                          {cfg.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <GoalProgressBar
                        percent={goal.percent}
                        displayStatus={displayStatus}
                      />

                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-foreground">
                          {formatMoney(goal.currentAmount)}
                        </span>
                        <span className="text-muted-foreground">
                          de {formatMoney(goal.targetAmount)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {goal.targetDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            <span
                              className={cn(
                                isOverdue(goal.targetDate) && 'text-red-500',
                              )}
                            >
                              {formatDate(goal.targetDate)}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {goal.contributionCount}{' '}
                          {goal.contributionCount === 1
                            ? 'contribuição'
                            : 'contribuições'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 border-t border-border pt-3">
                        <ContributeDialog
                          goalId={goal.id}
                          goalName={goal.name}
                          onContributed={refresh}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(goal.id, 'completed')
                          }
                          disabled={isPending}
                        >
                          <CheckCircle2 className="mr-1.5 size-4" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            handleStatusChange(goal.id, 'cancelled')
                          }
                          disabled={isPending}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Completed/cancelled goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Finalizadas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completedGoals.map((goal) => {
                  const displayStatus = getDisplayStatus(goal)
                  const cfg = statusConfig[displayStatus]

                  return (
                    <Card key={goal.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                displayStatus === 'completed'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {displayStatus === 'completed' ? (
                                <CheckCircle2 className="size-5" />
                              ) : (
                                <XCircle className="size-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base">
                                {goal.name}
                              </CardTitle>
                              {goal.description && (
                                <CardDescription className="mt-0.5 line-clamp-1 text-xs">
                                  {goal.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0 border', cfg.className)}
                          >
                            <span
                              className={cn(
                                'mr-1.5 inline-block size-1.5 rounded-full',
                                cfg.dotColor,
                              )}
                            />
                            {cfg.label}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-semibold text-foreground">
                            {formatMoney(goal.currentAmount)}
                          </span>
                          <span className="text-muted-foreground">
                            de {formatMoney(goal.targetAmount)} ({goal.percent}
                            %)
                          </span>
                        </div>

                        <div className="flex items-center border-t border-border pt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(goal.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="mr-1.5 size-4" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
