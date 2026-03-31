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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'outline' },
  completed: { label: 'Concluída', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

function GoalProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100)
  const barColor = percent >= 100 ? 'bg-green-500' : 'bg-primary'

  return (
    <div className="space-y-1">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{percent}% concluído</p>
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

// ── New Goal Dialog ──────────────────────────────────────────────────────────

function NewGoalDialog({
  groupId,
  onCreated,
}: {
  groupId: string
  onCreated: () => void
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

    if (!name.trim()) { setError('Informe o nome.'); return }
    if (!targetAmount.trim()) { setError('Informe o valor alvo.'); return }

    let parsed: string
    try { parsed = parseMoney(targetAmount) } catch {
      setError('Valor inválido.'); return
    }
    if (Number(parsed) <= 0) { setError('O valor deve ser maior que zero.'); return }

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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button>Nova meta</Button>
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

    if (!amount.trim()) { setError('Informe o valor.'); return }

    let parsed: string
    try { parsed = parseMoney(amount) } catch {
      setError('Valor inválido.'); return
    }
    if (Number(parsed) <= 0) { setError('O valor deve ser maior que zero.'); return }

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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm">Contribuir</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Contribuir para &ldquo;{goalName}&rdquo;</DialogTitle>
            <DialogDescription>
              Adicione um valor à meta
            </DialogDescription>
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

  function handleStatusChange(goalId: string, status: 'completed' | 'cancelled') {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metas</h1>
          <p className="text-muted-foreground">
            Acompanhe seus objetivos financeiros
          </p>
        </div>
        <NewGoalDialog groupId={groupId} onCreated={refresh} />
      </div>

      {initialGoals.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {initialGoals.map((goal) => {
            const cfg = statusConfig[goal.status] ?? statusConfig.active

            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{goal.name}</CardTitle>
                      {goal.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {goal.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={cfg.variant} className="shrink-0">
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <GoalProgressBar percent={goal.percent} />

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
                      <span>Limite: {formatDate(goal.targetDate)}</span>
                    )}
                    <span>
                      {goal.contributionCount}{' '}
                      {goal.contributionCount === 1
                        ? 'contribuição'
                        : 'contribuições'}
                    </span>
                    <span>por {goal.createdBy.name}</span>
                  </div>

                  {goal.status === 'active' && (
                    <div className="flex items-center gap-2 pt-1">
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
                        Concluir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          handleStatusChange(goal.id, 'cancelled')
                        }
                        disabled={isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {goal.status !== 'active' && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(goal.id)}
                        disabled={isPending}
                      >
                        Excluir meta
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
