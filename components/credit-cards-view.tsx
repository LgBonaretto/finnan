'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  createInstallmentTransaction,
} from '@/actions/credit-cards'
import { getCategories } from '@/actions/transactions'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Receipt,
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ───────────────────────────────────────────────────────────────────

type CreditCardType = {
  id: string
  groupId: string
  name: string
  brand: string | null
  lastDigits: string | null
  closingDay: number
  dueDay: number
  limitAmount: unknown
  color: string | null
  createdAt: Date | string
  deletedAt: Date | string | null
}

type ForecastTx = {
  creditCardId: string | null
  amount: unknown
  date: Date | string
  description: string | null
  installmentNumber: number | null
  installmentTotal: number | null
  installmentGroupId: string | null
}

type ForecastCard = {
  id: string
  name: string
  brand: string | null
  lastDigits: string | null
  limitAmount: number
  color: string | null
  closingDay: number
  dueDay: number
  monthlyForecast: Record<string, { total: number; transactions: ForecastTx[] }>
}

type Category = { id: string; name: string; type: string; color: string | null }

interface Props {
  cards: CreditCardType[]
  forecast: ForecastCard[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outro'] as const

const BRAND_COLORS: Record<string, string> = {
  Visa: 'bg-blue-500',
  Mastercard: 'bg-orange-500',
  Elo: 'bg-yellow-500',
  Amex: 'bg-green-500',
  Hipercard: 'bg-red-500',
  Outro: 'bg-gray-500',
}

function getBrandColor(brand: string | null) {
  return BRAND_COLORS[brand ?? ''] ?? 'bg-gray-500'
}

function buildFutureMonths(count: number) {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function formatMonthLabel(key: string) {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase())
}

// ── Component ───────────────────────────────────────────────────────────────

export function CreditCardsView({ cards, forecast }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Card modal
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null)
  const [cardForm, setCardForm] = useState({
    name: '',
    brand: '' as string,
    lastDigits: '',
    closingDay: '10',
    dueDay: '15',
    limitAmount: '',
    color: '',
  })

  // Installment modal
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [installForm, setInstallForm] = useState({
    creditCardId: '',
    description: '',
    totalAmount: '',
    installments: '3',
    firstDate: new Date().toISOString().split('T')[0],
    categoryId: '',
  })
  const [categories, setCategories] = useState<Category[]>([])

  function openNewCard() {
    setEditingCard(null)
    setCardForm({ name: '', brand: '', lastDigits: '', closingDay: '10', dueDay: '15', limitAmount: '', color: '' })
    setCardModalOpen(true)
  }

  function openEditCard(card: CreditCardType) {
    setEditingCard(card)
    setCardForm({
      name: card.name,
      brand: card.brand ?? '',
      lastDigits: card.lastDigits ?? '',
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      limitAmount: Number(card.limitAmount).toString(),
      color: card.color ?? '',
    })
    setCardModalOpen(true)
  }

  function saveCard() {
    startTransition(async () => {
      const data = {
        name: cardForm.name,
        brand: cardForm.brand || undefined,
        lastDigits: cardForm.lastDigits || undefined,
        closingDay: Number(cardForm.closingDay),
        dueDay: Number(cardForm.dueDay),
        limitAmount: cardForm.limitAmount ? Number(cardForm.limitAmount) : undefined,
        color: cardForm.color || undefined,
      }
      if (editingCard) {
        await updateCreditCard(editingCard.id, data)
      } else {
        await createCreditCard(data)
      }
      setCardModalOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCreditCard(id)
      router.refresh()
    })
  }

  async function openInstallModal() {
    setInstallForm({
      creditCardId: cards[0]?.id ?? '',
      description: '',
      totalAmount: '',
      installments: '3',
      firstDate: new Date().toISOString().split('T')[0],
      categoryId: '',
    })
    try {
      const cats = await getCategories(cards[0]?.groupId ?? '')
      setCategories(cats)
    } catch {
      setCategories([])
    }
    setInstallModalOpen(true)
  }

  function saveInstallment() {
    startTransition(async () => {
      await createInstallmentTransaction({
        creditCardId: installForm.creditCardId,
        description: installForm.description,
        totalAmount: Number(installForm.totalAmount),
        installments: Number(installForm.installments),
        firstDate: installForm.firstDate,
        categoryId: installForm.categoryId || undefined,
      })
      setInstallModalOpen(false)
      router.refresh()
    })
  }

  const installTotal = Number(installForm.totalAmount) || 0
  const installCount = Number(installForm.installments) || 1
  const installPerMonth = installTotal / installCount

  const futureMonths = buildFutureMonths(6)

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus cartões e compras parceladas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openInstallModal} disabled={cards.length === 0}>
            <Receipt className="mr-2 size-4" />
            <span className="hidden sm:inline">Compra parcelada</span>
          </Button>
          <Button onClick={openNewCard}>
            <Plus className="mr-2 size-4" />
            <span className="hidden sm:inline">Novo cartão</span>
          </Button>
        </div>
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <CreditCard className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum cartão cadastrado</CardTitle>
            <CardDescription>Adicione seu primeiro cartão de crédito para controlar parcelas.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="relative overflow-hidden">
              <div className={cn('absolute left-0 top-0 h-full w-1', getBrandColor(card.brand))} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{card.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="xs" variant="ghost" onClick={() => openEditCard(card)} disabled={isPending}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(card.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  {card.brand && (
                    <Badge variant="secondary" className="text-[10px]">{card.brand}</Badge>
                  )}
                  {card.lastDigits && (
                    <span className="text-xs text-muted-foreground">•••• {card.lastDigits}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>Fechamento: dia {card.closingDay} | Vencimento: dia {card.dueDay}</p>
                <p className="text-sm font-medium text-foreground">
                  Limite: {fmt.format(Number(card.limitAmount))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Previsão de Fatura</h2>
          {forecast.map((card) => {
            const limit = card.limitAmount
            return (
              <Card key={card.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('size-3 rounded-full', getBrandColor(card.brand))} />
                    <CardTitle className="text-sm">
                      {card.name}
                      {card.lastDigits && <span className="ml-1 text-muted-foreground">•••• {card.lastDigits}</span>}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {futureMonths.map((month) => {
                    const data = card.monthlyForecast[month]
                    const total = data?.total ?? 0
                    const pct = limit > 0 ? Math.round((total / limit) * 100) : 0
                    const barColor = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'

                    return (
                      <div key={month} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{formatMonthLabel(month)}</span>
                          <span className="text-muted-foreground">
                            {fmt.format(total)} / {fmt.format(limit)}
                            {limit > 0 && <span className="ml-1">({pct}%)</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full transition-all', barColor)}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Card Modal ── */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar cartão' : 'Novo cartão'}</DialogTitle>
            <DialogDescription>
              {editingCard ? 'Atualize os dados do cartão' : 'Cadastre um novo cartão de crédito'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Nubank"
                value={cardForm.name}
                onChange={(e) => setCardForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bandeira</Label>
                <Select value={cardForm.brand} onValueChange={(v) => setCardForm((f) => ({ ...f, brand: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Últimos 4 dígitos</Label>
                <Input
                  placeholder="1234"
                  maxLength={4}
                  value={cardForm.lastDigits}
                  onChange={(e) => setCardForm((f) => ({ ...f, lastDigits: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dia fechamento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={cardForm.closingDay}
                  onChange={(e) => setCardForm((f) => ({ ...f, closingDay: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={cardForm.dueDay}
                  onChange={(e) => setCardForm((f) => ({ ...f, dueDay: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite (R$)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={cardForm.limitAmount}
                onChange={(e) => setCardForm((f) => ({ ...f, limitAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor (hex)</Label>
              <Input
                placeholder="#7c3aed"
                value={cardForm.color}
                onChange={(e) => setCardForm((f) => ({ ...f, color: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveCard} disabled={isPending || !cardForm.name}>
              {isPending ? 'Salvando...' : editingCard ? 'Salvar' : 'Criar cartão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Installment Modal ── */}
      <Dialog open={installModalOpen} onOpenChange={setInstallModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compra parcelada</DialogTitle>
            <DialogDescription>Registre uma compra parcelada no cartão de crédito</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select
                value={installForm.creditCardId}
                onValueChange={(v) => setInstallForm((f) => ({ ...f, creditCardId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.lastDigits ? `•••• ${c.lastDigits}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Geladeira nova"
                value={installForm.description}
                onChange={(e) => setInstallForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor total (R$)</Label>
                <Input
                  type="number"
                  placeholder="3000"
                  value={installForm.totalAmount}
                  onChange={(e) => setInstallForm((f) => ({ ...f, totalAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select
                  value={installForm.installments}
                  onValueChange={(v) => setInstallForm((f) => ({ ...f, installments: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 47 }, (_, i) => i + 2).map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data da 1ª parcela</Label>
              <Input
                type="date"
                value={installForm.firstDate}
                onChange={(e) => setInstallForm((f) => ({ ...f, firstDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select
                value={installForm.categoryId}
                onValueChange={(v) => setInstallForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {categories.filter((c) => c.type === 'expense').map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {installTotal > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                <p className="text-sm font-medium text-foreground">
                  {fmt.format(installTotal)} em {installCount}x de{' '}
                  <span className="text-primary">{fmt.format(installPerMonth)}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveInstallment}
              disabled={isPending || !installForm.creditCardId || !installForm.description || !installTotal}
            >
              {isPending ? 'Salvando...' : 'Criar parcelas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
