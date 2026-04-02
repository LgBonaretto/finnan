import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getFamilyReport } from '@/actions/family-report'
import { FamilyReportView } from '@/components/family-report-view'

interface Props {
  searchParams: Promise<{ month?: string }>
}

export default async function FamilyReportPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const group = groups[0]
  const isAdmin = group.role === 'owner' || group.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const month =
    params.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const report = await getFamilyReport(group.id, month)

  return (
    <FamilyReportView groupId={group.id} month={month} children={report} />
  )
}
