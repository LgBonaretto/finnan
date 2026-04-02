import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getUsers } from '@/actions/admin'
import { AdminUsersView } from '@/components/admin-users-view'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== 'SUPERADMIN') redirect('/dashboard')

  const users = await getUsers()

  return <AdminUsersView users={users} currentUserId={session.user.id} />
}
