import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getSubscription } from '@/actions/billing'
import { PLANS } from '@/lib/plan-limits'
import { BillingPage } from '@/components/billing-page'

export default async function SettingsBillingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const group = groups[0]
  const subscription = await getSubscription(group.id)

  return (
    <BillingPage
      groupId={group.id}
      currentPlan={(subscription?.plan as 'free' | 'family' | 'group') ?? 'free'}
      stripeConfigured={subscription?.stripeConfigured ?? false}
      subscription={subscription?.subscription ?? null}
      userRole={group.role}
      plans={Object.values(PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        features: p.features,
      }))}
    />
  )
}
