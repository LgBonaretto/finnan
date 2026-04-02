'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  PiggyBank,
  Users,
  CreditCard,
  Settings,
  Activity,
  BarChart3,
  Calculator,
  FileUser,
  Swords,
} from 'lucide-react'
import { FinnanLogo } from '@/components/finnan-logo'

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Orçamentos', href: '/budgets', icon: Wallet },
  { label: 'Metas', href: '/goals', icon: Target },
  { label: 'Relatórios', href: '/reports', icon: BarChart3 },
  { label: 'Relatório Família', href: '/family-report', icon: FileUser, adminOnly: true },
  { label: 'Atividades', href: '/feed', icon: Activity },
  { label: 'Missões', href: '/missions', icon: Swords },
  { label: 'Calculadoras', href: '/calculators', icon: Calculator },
  { label: 'Mesadas', href: '/allowances', icon: PiggyBank },
  { label: 'Grupos', href: '/groups', icon: Users },
  { label: 'Planos', href: '/settings/billing', icon: CreditCard },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

interface Props {
  className?: string
  userRole?: string | null
}

export function AppSidebar({ className, userRole }: Props) {
  const pathname = usePathname()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Logo */}
      <Link href="/dashboard" className="flex h-14 items-center px-5">
        <FinnanLogo height={28} variant="dark" />
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/settings'
              ? pathname === '/settings'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[11px] text-sidebar-foreground/40">
          Tukkan v0.1.0
        </p>
      </div>
    </div>
  )
}
