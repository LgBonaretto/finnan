'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Grupos',
    href: '/admin/groups',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Usuários',
    href: '/admin/users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-neutral-950 md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <Link href="/admin/dashboard" className="text-base font-bold text-white">
          Tukkan
        </Link>
        <Badge variant="secondary" className="text-[10px]">Admin</Badge>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="truncate text-xs text-neutral-400">{userName}</p>
        <Link
          href="/dashboard"
          className="mt-1 block text-xs text-neutral-500 hover:text-neutral-300"
        >
          ← Voltar ao app
        </Link>
      </div>
    </aside>
  )
}
