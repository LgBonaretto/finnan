'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/money'

type PlanId = 'free' | 'family' | 'group'
import { createCheckoutSession, createPortalSession } from '@/actions/billing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type PlanData = {
  id: PlanId
  name: string
  description: string
  priceMonthly: number
  features: string[]
}

interface Props {
  groupId: string
  currentPlan: PlanId
  stripeConfigured: boolean
  subscription: {
    status: string
    currentPeriodEnd: Date | string | null
    cancelAtPeriodEnd: boolean
  } | null
  userRole: string
  plans: PlanData[]
}

const planOrder: PlanId[] = ['free', 'family', 'group']

export function BillingPage({
  groupId,
  currentPlan,
  stripeConfigured,
  subscription,
  userRole,
  plans,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  function handleCheckout(planId: PlanId) {
    startTransition(async () => {
      const result = await createCheckoutSession(groupId, planId)
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    })
  }

  function handlePortal() {
    startTransition(async () => {
      const result = await createPortalSession(groupId)
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground">
          Gerencie a assinatura do seu grupo
        </p>
      </div>

      {/* Subscription status */}
      {subscription && currentPlan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinatura ativa</CardTitle>
            <CardDescription>
              Plano {plans.find((p) => p.id === currentPlan)?.name ?? currentPlan}
              {subscription.status === 'active' && ' — Ativa'}
              {subscription.status === 'past_due' && ' — Pagamento pendente'}
              {subscription.cancelAtPeriodEnd &&
                ' — Cancela no fim do período'}
            </CardDescription>
          </CardHeader>
          {subscription.currentPeriodEnd && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Próxima cobrança:{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  'pt-BR',
                  { day: '2-digit', month: 'long', year: 'numeric' },
                )}
              </p>
            </CardContent>
          )}
          {isAdmin && stripeConfigured && (
            <CardFooter>
              <Button variant="outline" onClick={handlePortal} disabled={isPending}>
                Gerenciar assinatura
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const planId = plan.id
          const isCurrent = planId === currentPlan
          const isUpgrade =
            planOrder.indexOf(planId) > planOrder.indexOf(currentPlan)

          return (
            <Card
              key={planId}
              className={isCurrent ? 'ring-2 ring-primary' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  {plan.priceMonthly === 0 ? (
                    <span className="text-3xl font-bold text-foreground">
                      Grátis
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        {formatMoney(plan.priceMonthly / 100)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /mês
                      </span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-green-600"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" variant="secondary" disabled>
                    Plano atual
                  </Button>
                ) : isUpgrade && isAdmin ? (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(planId)}
                    disabled={isPending || !stripeConfigured}
                  >
                    {!stripeConfigured
                      ? 'Pagamento indisponível'
                      : isPending
                        ? 'Redirecionando...'
                        : `Assinar ${plan.name}`}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    {isAdmin ? 'Downgrade via portal' : 'Contate o admin'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {!stripeConfigured && (
        <p className="text-center text-sm text-muted-foreground">
          Pagamentos via Stripe ainda não estão configurados neste ambiente.
        </p>
      )}
    </div>
  )
}
