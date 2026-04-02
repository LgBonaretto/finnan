'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney, parseMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { createMission, completeMission, deleteMission } from '@/actions/missions'
import {
  Swords,
  Plus,
  Trophy,
  Clock,
  XCircle,
  CheckCircle2,
  Trash2,
  Target,
  Wallet,
  Ban,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Mission = {
  id: string
  title: string
  description: string | null
  type: string
  targetAmount: number | null
  currentAmount: number
  categoryId: string | null
  startDate: Date | string
  endDate: Date | string
  status: string
  reward: number
  createdBy: string
  percent: number
}

type Category = {
  id: string
  name: string
  type: string
  color: string | null
}

interface Props {
  groupId: string
  userRole: string
  initialMissions: Mission[]
  categories: Category[]
}

const MISSION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Target; color: string }
> = {
  SPEND_LESS: {
    label: 'Gastar menos',
    icon: Wallet,
    color: 'bg-blue-500/10 text-blue-500',
  },
  SAVE_AMOUNT: {
    label: 'Economizar',
    icon: Target,
    color: 'bg-green-500/10 text-green-500',
  },
  NO_SPEND_CATEGORY: {
    label: 'Zero gastos',
    icon: Ban,
    color: 'bg-red-500/10 text-red-500',
  },
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  active: {
    label: 'Ativa',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
    dotColor: 'bg-blue-500',
  },
  completed: {
    label: 'Concluída',
    className: 'border-green-500/30 bg-green-500/10 text-green-500',
    dotColor: 'bg-green-500',
  },
  failed: {
    label: 'Falhou',
    className: 'border-red-500/30 bg-red-500/10 text-red-500',
    dotColor: 'bg-red-500',
  },
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function daysRemaining(endDate: Date | string): number {
  const end = new Date(endDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}

// ── New Mission Dialog ──────────────────────────────────────────────────

function NewMissionDialog({
  groupId,
  categories,
  onCreated,
}: {
  groupId: string
  categories: Category[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<string>('SPEND_LESS')
  const [targetAmount, setTargetAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [endDate, setEndDate] = useState('')
  const [reward, setReward] = useState('50')

  function reset() {
    setTitle('')
    setDescription('')
    setType('SPEND_LESS')
    setTargetAmount('')
    setCategoryId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setReward('50')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Informe o título.')
      return
    }
    if (!endDate) {
      setError('Informe a data de término.')
      return
    }

    let parsedAmount: string | undefined
    if (targetAmount.trim() && type !== 'NO_SPEND_CATEGORY') {
      try {
        parsedAmount = parseMoney(targetAmount)
      } catch {
        setError('Valor alvo inválido.')
        return
      }
    }

    startTransition(async () => {
      try {
        await createMission({
          groupId,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          targetAmount: parsedAmount,
          categoryId: categoryId || undefined,
          startDate,
          endDate,
          reward: parseInt(reward, 10) || 0,
        })
        reset()
        setOpen(false)
        onCreated()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar missão.')
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
        <Button>
          <Plus className="mr-2 size-4" />
          Nova missão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar missão</DialogTitle>
            <DialogDescription>
              Defina um desafio financeiro para o grupo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ex: Semana sem delivery"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Detalhes da missão"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPEND_LESS">Gastar menos que X</SelectItem>
                  <SelectItem value="SAVE_AMOUNT">Economizar X</SelectItem>
                  <SelectItem value="NO_SPEND_CATEGORY">
                    Zero gastos em categoria
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type !== 'NO_SPEND_CATEGORY' && (
              <div className="space-y-2">
                <Label>Valor alvo (R$)</Label>
                <Input
                  placeholder="500,00"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
            )}

            {type === 'NO_SPEND_CATEGORY' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recompensa (pontos)</Label>
              <Input
                inputMode="numeric"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar missão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export function MissionsView({
  groupId,
  userRole,
  initialMissions,
  categories,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const activeMissions = initialMissions.filter((m) => m.status === 'active')
  const completedMissions = initialMissions.filter((m) => m.status !== 'active')

  function handleComplete(missionId: string) {
    startTransition(async () => {
      await completeMission(missionId)
      router.refresh()
    })
  }

  function handleDelete(missionId: string) {
    startTransition(async () => {
      await deleteMission(missionId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Missões
          </h1>
          <p className="text-sm text-muted-foreground">
            Desafios financeiros para o grupo
          </p>
        </div>
        {isAdmin && (
          <NewMissionDialog
            groupId={groupId}
            categories={categories}
            onCreated={() => router.refresh()}
          />
        )}
      </div>

      {/* Empty state */}
      {initialMissions.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Swords className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma missão</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Crie missões financeiras para desafiar o grupo.'
                : 'Aguarde o admin criar missões para o grupo.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active missions */}
          {activeMissions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeMissions.map((mission) => {
                const typeConfig =
                  MISSION_TYPE_CONFIG[mission.type] ?? MISSION_TYPE_CONFIG.SPEND_LESS
                const statusCfg = STATUS_CONFIG[mission.status] ?? STATUS_CONFIG.active
                const days = daysRemaining(mission.endDate)
                const TypeIcon = typeConfig.icon

                return (
                  <Card
                    key={mission.id}
                    className="transition-colors hover:border-foreground/10"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-xl',
                              typeConfig.color,
                            )}
                          >
                            <TypeIcon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-base">
                              {mission.title}
                            </CardTitle>
                            {mission.description && (
                              <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                                {mission.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 border', statusCfg.className)}
                        >
                          <span
                            className={cn(
                              'mr-1.5 inline-block size-1.5 rounded-full',
                              statusCfg.dotColor,
                            )}
                          />
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress */}
                      {mission.targetAmount && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">
                              {mission.percent}%
                            </span>
                            <span className="text-muted-foreground">
                              {formatMoney(mission.currentAmount)} de{' '}
                              {formatMoney(mission.targetAmount)}
                            </span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                mission.percent >= 100
                                  ? 'bg-green-500'
                                  : 'bg-blue-500',
                              )}
                              style={{
                                width: `${Math.min(mission.percent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {days > 0 ? `${days} dias restantes` : 'Encerrada'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="size-3" />
                          {mission.reward} pontos
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {typeConfig.label}
                        </Badge>
                      </div>

                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 border-t border-border pt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(mission.id)}
                            disabled={isPending}
                          >
                            <CheckCircle2 className="mr-1.5 size-4" />
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(mission.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Completed missions */}
          {completedMissions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Finalizadas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completedMissions.map((mission) => {
                  const statusCfg =
                    STATUS_CONFIG[mission.status] ?? STATUS_CONFIG.failed
                  const isCompleted = mission.status === 'completed'

                  return (
                    <Card key={mission.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                isCompleted
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {isCompleted ? (
                                <Trophy className="size-5" />
                              ) : (
                                <XCircle className="size-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base">
                                {mission.title}
                              </CardTitle>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 border',
                              statusCfg.className,
                            )}
                          >
                            <span
                              className={cn(
                                'mr-1.5 inline-block size-1.5 rounded-full',
                                statusCfg.dotColor,
                              )}
                            />
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatDate(mission.startDate)} -{' '}
                            {formatDate(mission.endDate)}
                          </span>
                          {isCompleted && (
                            <span className="flex items-center gap-1 font-medium text-green-500">
                              <Trophy className="size-3" />+{mission.reward} pts
                            </span>
                          )}
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
