import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroups } from '@/actions/groups'
import { getReportData } from '@/actions/reports'
import { ReportsView } from '@/components/reports-view'

interface Props {
  searchParams: Promise<{ year?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getGroups()
  if (groups.length === 0) redirect('/groups')

  const groupId = groups[0].id
  const params = await searchParams
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()

  const data = await getReportData(groupId, year)

  return <ReportsView groupId={groupId} year={year} data={data} />
}
