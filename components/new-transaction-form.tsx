'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/actions/transactions'
import { parseMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Informe o valor'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().min(1, 'Informe a data'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
})

type TransactionValues = z.infer<typeof transactionSchema>

type Category = {
  id: string
  name: string
  type: string
  color: string | null
}

interface Props {
  groupId: string
  categories: Category[]
}

export function NewTransactionForm({ groupId, categories }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [aiSuggested, setAiSuggested] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TransactionValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const selectedType = watch('type')
  const selectedCategoryId = watch('categoryId')
  const filteredCategories = categories.filter((c) => c.type === selectedType)

  const handleDescriptionBlur = useCallback(async () => {
    const description = getValues('description')
    if (!description || description.trim().length < 3) return

    setAiLoading(true)
    setAiSuggested(false)
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          groupId,
          type: selectedType,
        }),
      })
      if (!res.ok) return

      const data = await res.json()
      if (data.categoryId) {
        const currentCat = getValues('categoryId')
        if (!currentCat) {
          setValue('categoryId', data.categoryId)
          setAiSuggested(true)
        }
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false)
    }
  }, [getValues, setValue, groupId, selectedType])

  async function onSubmit(data: TransactionValues) {
    setError(null)

    let parsedAmount: string
    try {
      parsedAmount = parseMoney(data.amount)
    } catch {
      setError('Valor inválido. Use o formato: 100,00')
      return
    }

    if (Number(parsedAmount) <= 0) {
      setError('O valor deve ser maior que zero.')
      return
    }

    try {
      const recurrence = data.recurrence && data.recurrence !== 'none' ? data.recurrence : undefined
      await createTransaction({
        groupId,
        type: data.type,
        amount: parsedAmount,
        description: data.description,
        categoryId: data.categoryId,
        date: data.date,
        recurrence,
      })
      router.push('/transactions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar transação.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Nova transação</CardTitle>
        <CardDescription>Registre uma receita ou despesa</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setValue('type', 'expense')
                  setValue('categoryId', '')
                  setAiSuggested(false)
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedType === 'expense'
                    ? 'border-red-500/50 bg-red-500/10 text-red-500'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('type', 'income')
                  setValue('categoryId', '')
                  setAiSuggested(false)
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedType === 'income'
                    ? 'border-green-600/50 bg-green-600/10 text-green-600'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Receita
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              placeholder="0,00"
              inputMode="decimal"
              {...register('amount')}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado"
              {...register('description', { onBlur: handleDescriptionBlur })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="categoryId">Categoria</Label>
              {aiLoading && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="inline-block size-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  Sugerindo...
                </span>
              )}
              {aiSuggested && !aiLoading && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  IA sugeriu
                </span>
              )}
            </div>
            <Select
              value={selectedCategoryId ?? ''}
              onValueChange={(v) => {
                setValue('categoryId', v)
                setAiSuggested(false)
              }}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recorrência</Label>
            <Select
              value={watch('recurrence') ?? 'none'}
              onValueChange={(v) =>
                setValue('recurrence', v as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly')
              }
            >
              <SelectTrigger id="recurrence">
                <SelectValue placeholder="Sem recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nunca</SelectItem>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar transação'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
