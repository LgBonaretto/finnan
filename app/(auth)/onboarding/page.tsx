'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Home, Briefcase, ArrowRight, Check } from 'lucide-react'
import { FinnanLogo } from '@/components/finnan-logo'

import { completeOnboarding } from '@/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const GROUP_TYPES = [
  {
    value: 'family',
    label: 'Família',
    description: 'Gerencie finanças com sua família',
    icon: Home,
  },
  {
    value: 'couple',
    label: 'Casal',
    description: 'Controle de gastos a dois',
    icon: Users,
  },
  {
    value: 'roommates',
    label: 'República',
    description: 'Divida despesas com colegas',
    icon: Briefcase,
  },
]

const CURRENCIES = [
  { value: 'BRL', label: 'R$ — Real brasileiro' },
  { value: 'USD', label: '$ — Dólar americano' },
  { value: 'EUR', label: '€ — Euro' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [groupType, setGroupType] = useState('family')
  const [groupName, setGroupName] = useState('')
  const [currency, setCurrency] = useState('BRL')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleFinish() {
    if (!groupName.trim()) {
      setError('Digite um nome para o grupo.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await completeOnboarding({
        groupName: groupName.trim(),
        groupType,
        currency,
      })

      if (!result.success) {
        setError('Erro ao criar grupo. Tente novamente.')
        setIsSubmitting(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Erro inesperado. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <FinnanLogo height={40} />
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome + group type */}
        {step === 0 && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                Bem-vindo ao Tukkan!
              </CardTitle>
              <CardDescription>
                Vamos configurar seu espaço. Como você vai usar o Tukkan?
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {GROUP_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setGroupType(type.value)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                    groupType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      groupType === type.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <type.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                  {groupType === type.value && (
                    <Check className="size-5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                onClick={() => setStep(1)}
              >
                Continuar
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 1: Group name */}
        {step === 1 && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                Nome do grupo
              </CardTitle>
              <CardDescription>
                Escolha um nome para identificar seu grupo
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Nome</Label>
                <Input
                  id="groupName"
                  placeholder={
                    groupType === 'family'
                      ? 'Ex: Família Silva'
                      : groupType === 'couple'
                        ? 'Ex: João & Maria'
                        : 'Ex: Apt 302'
                  }
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(0)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (!groupName.trim()) {
                    setError('Digite um nome para o grupo.')
                    return
                  }
                  setError(null)
                  setStep(2)
                }}
              >
                Continuar
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>

            {error && step === 1 && (
              <div className="px-6 pb-4">
                <p className="text-center text-sm text-destructive">{error}</p>
              </div>
            )}
          </Card>
        )}

        {/* Step 2: Currency + confirm */}
        {step === 2 && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                Moeda principal
              </CardTitle>
              <CardDescription>
                Qual moeda você usa no dia a dia?
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCurrency(c.value)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                    currency === c.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">
                    {c.label}
                  </span>
                  {currency === c.value && (
                    <Check className="size-5 shrink-0 text-primary" />
                  )}
                </button>
              ))}

              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleFinish}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Começar a usar'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
