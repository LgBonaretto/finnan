import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCreditCards, getCardForecast } from '@/actions/credit-cards'
import { CreditCardsView } from '@/components/credit-cards-view'

export default async function CreditCardsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [cards, forecast] = await Promise.all([
    getCreditCards(),
    getCardForecast(6),
  ])

  return <CreditCardsView cards={cards} forecast={forecast} />
}
