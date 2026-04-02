import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Check onboarding from DB to avoid stale JWT issues
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  })

  if (!user?.onboardingCompleted) {
    redirect('/onboarding')
  }

  // Get user role for sidebar visibility
  const membership = await prisma.groupMember.findFirst({
    where: { userId: session.user.id },
    select: { role: true },
    orderBy: { joinedAt: 'asc' },
  })

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <AppSidebar userRole={membership?.role ?? null} />
      </aside>

      <div className="flex flex-1 flex-col">
        <AppHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
