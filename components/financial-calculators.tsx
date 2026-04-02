'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/money'
import { Calculator, TrendingUp, Landmark } from 'lucide-react'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

// ── Compound Interest Calculator ──────────────────────────────────────────

function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [period, setPeriod] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [result, setResult] = useState<{
    finalAmount: number
    totalInvested: number
    totalInterest: number
  } | null>(null)

  function calculate() {
    const p = parseFloat(principal.replace(',', '.')) || 0
    const r = (parseFloat(rate.replace(',', '.')) || 0) / 100 / 12
    const n = parseInt(period, 10) || 0
    const m = parseFloat(monthlyContribution.replace(',', '.')) || 0

    if (n <= 0) return

    // FV = P*(1+r)^n + M*((1+r)^n - 1)/r
    let finalAmount: number
    if (r === 0) {
      finalAmount = p + m * n
    } else {
      finalAmount =
        p * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r)
    }

    const totalInvested = p + m * n
    const totalInterest = finalAmount - totalInvested

    setResult({ finalAmount, totalInvested, totalInterest })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ci-principal">Valor inicial (R$)</Label>
          <Input
            id="ci-principal"
            placeholder="1.000"
            inputMode="decimal"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-monthly">Aporte mensal (R$)</Label>
          <Input
            id="ci-monthly"
            placeholder="500"
            inputMode="decimal"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-rate">Taxa anual (%)</Label>
          <Input
            id="ci-rate"
            placeholder="12"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-period">Período (meses)</Label>
          <Input
            id="ci-period"
            placeholder="120"
            inputMode="numeric"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={calculate} className="w-full">
        Calcular
      </Button>

      {result && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-muted-foreground">Valor final</p>
              <p className="text-lg font-bold text-green-600">
                {formatMoney(result.finalAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-muted-foreground">Total investido</p>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(result.totalInvested)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-muted-foreground">Total em juros</p>
              <p className="text-lg font-bold text-primary">
                {formatMoney(result.totalInterest)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Retirement Calculator ─────────────────────────────────────────────────

function RetirementCalc() {
  const [currentAge, setCurrentAge] = useState('')
  const [targetAge, setTargetAge] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [currentSavings, setCurrentSavings] = useState('')
  const [annualReturn, setAnnualReturn] = useState('')
  const [result, setResult] = useState<{
    totalAtRetirement: number
    totalContributed: number
    totalInterest: number
    yearsToRetire: number
  } | null>(null)

  function calculate() {
    const age = parseInt(currentAge, 10) || 0
    const target = parseInt(targetAge, 10) || 0
    const monthly = parseFloat(monthlyContribution.replace(',', '.')) || 0
    const savings = parseFloat(currentSavings.replace(',', '.')) || 0
    const rate = (parseFloat(annualReturn.replace(',', '.')) || 0) / 100 / 12

    const yearsToRetire = target - age
    if (yearsToRetire <= 0) return

    const months = yearsToRetire * 12

    let totalAtRetirement: number
    if (rate === 0) {
      totalAtRetirement = savings + monthly * months
    } else {
      totalAtRetirement =
        savings * Math.pow(1 + rate, months) +
        monthly * ((Math.pow(1 + rate, months) - 1) / rate)
    }

    const totalContributed = savings + monthly * months
    const totalInterest = totalAtRetirement - totalContributed

    setResult({
      totalAtRetirement,
      totalContributed,
      totalInterest,
      yearsToRetire,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rt-age">Idade atual</Label>
          <Input
            id="rt-age"
            placeholder="30"
            inputMode="numeric"
            value={currentAge}
            onChange={(e) => setCurrentAge(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-target">Idade alvo</Label>
          <Input
            id="rt-target"
            placeholder="65"
            inputMode="numeric"
            value={targetAge}
            onChange={(e) => setTargetAge(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-savings">Patrimônio atual (R$)</Label>
          <Input
            id="rt-savings"
            placeholder="10.000"
            inputMode="decimal"
            value={currentSavings}
            onChange={(e) => setCurrentSavings(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-monthly">Aporte mensal (R$)</Label>
          <Input
            id="rt-monthly"
            placeholder="1.000"
            inputMode="decimal"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="rt-return">Retorno anual esperado (%)</Label>
          <Input
            id="rt-return"
            placeholder="10"
            inputMode="decimal"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={calculate} className="w-full">
        Calcular
      </Button>

      {result && (
        <div className="space-y-3">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Patrimônio aos {parseInt(targetAge, 10)} anos ({result.yearsToRetire} anos)
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatMoney(result.totalAtRetirement)}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Total contribuído
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatMoney(result.totalContributed)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Rendimento total
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatMoney(result.totalInterest)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export function FinancialCalculators() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Calculadoras
        </h1>
        <p className="text-sm text-muted-foreground">
          Ferramentas para planejar suas finanças
        </p>
      </div>

      <Tabs defaultValue="compound" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compound" className="gap-1.5">
            <TrendingUp className="size-4" />
            Juros compostos
          </TabsTrigger>
          <TabsTrigger value="retirement" className="gap-1.5">
            <Landmark className="size-4" />
            Aposentadoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compound">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-green-600/10 text-green-600">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <CardTitle>Juros compostos</CardTitle>
                  <CardDescription>
                    Simule o crescimento do seu investimento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CompoundInterestCalc />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retirement">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Landmark className="size-5" />
                </div>
                <div>
                  <CardTitle>Aposentadoria</CardTitle>
                  <CardDescription>
                    Planeje sua independência financeira
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RetirementCalc />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
