import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.userRole !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userName={session.user.name ?? 'Admin'} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
