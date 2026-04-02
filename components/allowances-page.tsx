'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PiggyBank, Plus, Check, X, Clock, Send, Trophy, Star, Medal } from 'lucide-react'
import { formatMoney } from '@/lib/money'

import {
  createAllowance,
  deleteAllowance,
  requestWithdrawal,
  approveRequest,
  declineRequest,
} from '@/actions/allowances'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

type Allowance = {
  id: string
  childId: string
  childName: string
  childEmail: string | null
  amount: number
  frequency: string
  dayOfMonth: number | null
  isActive: boolean
  pendingRequests: number
  createdAt: Date
}

type PendingRequest = {
  id: string
  amount: number
  reason: string | null
  childName: string
  createdAt: Date
}

type MyAllowance = {
  id: string
  amount: number
  frequency: string
  availableBalance: number
} | null

type MyRequest = {
  id: string
  amount: number
  reason: string | null
  status: string
  reviewedAt: Date | null
  createdAt: Date
}

type GroupMember = {
  userId: string
  userName: string
  role: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          Pendente
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
          Aprovado
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
          Recusado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ── Admin View ──────────────────────────────────────────────────────────────

function AdminView({
  groupId,
  allowances: initial,
  pendingRequests: initialPending,
  members,
}: {
  groupId: string
  allowances: Allowance[]
  pendingRequests: PendingRequest[]
  members: GroupMember[]
}) {
  const router = useRouter()
  const [allowances, setAllowances] = useState(initial)
  const [pending, setPending] = useState(initialPending)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Members without active allowance
  const existingChildIds = new Set(allowances.filter((a) => a.isActive).map((a) => a.childId))
  const availableMembers = members.filter((m) => !existingChildIds.has(m.userId))

  async function handleCreate() {
    if (!selectedMember || !amount) return
    setCreating(true)
    setError(null)
    try {
      const result = await createAllowance({
        groupId,
        childId: selectedMember,
        amount,
        frequency,
      })
      if (result.error) {
        setError(result.error)
        setCreating(false)
        return
      }
      setDialogOpen(false)
      setSelectedMember('')
      setAmount('')
      router.refresh()
    } catch {
      setError('Erro ao criar mesada.')
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    try {
      await deleteAllowance(id)
      setAllowances((prev) => prev.filter((a) => a.id !== id))
      router.refresh()
    } catch { /* ignore */ }
  }

  async function handleApprove(id: string) {
    try {
      await approveRequest(id)
      setPending((prev) => prev.filter((r) => r.id !== id))
      router.refresh()
    } catch { /* ignore */ }
  }

  async function handleDecline(id: string) {
    try {
      await declineRequest(id)
      setPending((prev) => prev.filter((r) => r.id !== id))
      router.refresh()
    } catch { /* ignore */ }
  }

  const activeAllowances = allowances.filter((a) => a.isActive)

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Mesadas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as mesadas dos membros</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nova Mesada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Mesada</DialogTitle>
              <DialogDescription>Configure a mesada para um membro do grupo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Membro</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.userName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as 'weekly' | 'monthly')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !selectedMember || !amount}>
                {creating ? 'Criando...' : 'Criar Mesada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-yellow-500" />
              <CardTitle className="text-base">Pedidos Pendentes</CardTitle>
              <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                {pending.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{req.childName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(req.amount)}
                    {req.reason && ` — ${req.reason}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="icon-xs"
                    variant="outline"
                    className="text-green-600 hover:bg-green-500/10 hover:text-green-600"
                    onClick={() => handleApprove(req.id)}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="outline"
                    className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => handleDecline(req.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Allowance List */}
      {activeAllowances.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <PiggyBank className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Nenhuma mesada configurada</CardTitle>
            <CardDescription>
              Crie uma mesada para os membros do grupo acompanharem seus gastos
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeAllowances.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {getInitials(a.childName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">{a.childName}</CardTitle>
                      <CardDescription className="text-xs">
                        {a.frequency === 'monthly' ? 'Mensal' : 'Semanal'}
                      </CardDescription>
                    </div>
                  </div>
                  {a.pendingRequests > 0 && (
                    <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                      {a.pendingRequests} pendente{a.pendingRequests > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">
                    {formatMoney(a.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a.id)}
                  >
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Child View ──────────────────────────────────────────────────────────────

function ChildView({
  myAllowance,
  myRequests: initialRequests,
}: {
  myAllowance: MyAllowance
  myRequests: MyRequest[]
}) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!myAllowance) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Mesada</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua mesada</p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <PiggyBank className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Sem mesada configurada</CardTitle>
            <CardDescription>
              Peça a um administrador do grupo para configurar sua mesada
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  async function handleRequest() {
    if (!myAllowance || !amount || !description.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await requestWithdrawal({
        allowanceId: myAllowance.id,
        amount,
        description: description.trim(),
      })
      setDialogOpen(false)
      setAmount('')
      setDescription('')
      router.refresh()
    } catch {
      setError('Erro ao solicitar retirada.')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Mesada</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua mesada</p>
      </div>

      {/* Balance Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo disponível</p>
              <p className="text-3xl font-bold text-foreground">
                {formatMoney(myAllowance.availableBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Valor {myAllowance.frequency === 'monthly' ? 'mensal' : 'semanal'}:{' '}
                {formatMoney(myAllowance.amount)}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="size-4" />
                  Solicitar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Retirada</DialogTitle>
                  <DialogDescription>
                    Saldo disponível: {formatMoney(myAllowance.availableBalance)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={myAllowance.availableBalance}
                      placeholder="50.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Para que precisa?</Label>
                    <Input
                      placeholder="Ex: Material escolar"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleRequest}
                    disabled={submitting || !amount || !description.trim()}
                  >
                    {submitting ? 'Enviando...' : 'Enviar pedido'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido realizado.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatMoney(r.amount)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.reason ?? 'Sem descrição'}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────────────────────

// ── Leaderboard ────────────────────────────────────────────────────────

type LeaderboardEntry = {
  userId: string
  userName: string | null
  totalPoints: number
  level: string
  levelColor: string
}

type PointHistoryItem = {
  id: string
  amount: number
  reason: string
  createdAt: Date | string
}

type MyPointsData = {
  total: number
  history: PointHistoryItem[]
  level: string
  levelColor: string
} | null

const LEVEL_ICONS: Record<string, typeof PiggyBank> = {
  Iniciante: Star,
  Poupador: Medal,
  Expert: Trophy,
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-yellow-500" />
          <CardTitle className="text-base">Placar de Pontos</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const LevelIcon = LEVEL_ICONS[entry.level] ?? Star
            return (
              <div
                key={entry.userId}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                  {index + 1}
                </span>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {getInitials(entry.userName ?? 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.userName ?? 'Usuário'}
                  </p>
                  <p className={`flex items-center gap-1 text-xs ${entry.levelColor}`}>
                    <LevelIcon className="size-3" />
                    {entry.level}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {entry.totalPoints} pts
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function PointsSection({ myPoints }: { myPoints: MyPointsData }) {
  if (!myPoints) return null

  const LevelIcon = LEVEL_ICONS[myPoints.level] ?? Star

  return (
    <>
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Meus pontos</p>
              <p className="text-3xl font-bold text-foreground">
                {myPoints.total} <span className="text-lg text-muted-foreground">pts</span>
              </p>
              <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${myPoints.levelColor}`}>
                <LevelIcon className="size-4" />
                {myPoints.level}
              </p>
            </div>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-yellow-500/10">
              <Trophy className="size-8 text-yellow-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {myPoints.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de pontos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myPoints.history.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-foreground">{p.reason}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    +{p.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export function AllowancesPage({
  role,
  groupId,
  allowances,
  pendingRequests,
  members,
  myAllowance,
  myRequests,
  leaderboard,
  myPoints,
}: {
  role: string
  groupId: string
  allowances: Allowance[]
  pendingRequests: PendingRequest[]
  members: GroupMember[]
  myAllowance: MyAllowance
  myRequests: MyRequest[]
  leaderboard: LeaderboardEntry[]
  myPoints: MyPointsData
}) {
  const isAdmin = role === 'owner' || role === 'admin'

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <AdminView
          groupId={groupId}
          allowances={allowances}
          pendingRequests={pendingRequests}
          members={members}
        />
        <Leaderboard entries={leaderboard} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ChildView myAllowance={myAllowance} myRequests={myRequests} />
      <PointsSection myPoints={myPoints} />
      <Leaderboard entries={leaderboard} />
    </div>
  )
}
