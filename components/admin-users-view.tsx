'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateGroupPlan, updateUserRole } from '@/actions/admin'
import type { AdminUser } from '@/actions/admin'
import { Shield, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  users: AdminUser[]
  currentUserId: string
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'border-border text-muted-foreground' },
  family: { label: 'Family', color: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
  group: { label: 'Group', color: 'border-green-500/30 bg-green-500/10 text-green-500' },
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  USER: { label: 'Usuário', color: 'border-border text-muted-foreground' },
  SUPERADMIN: { label: 'Super Admin', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' },
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminUsersView({ users, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  })

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      await updateUserRole(userId, role)
      router.refresh()
    })
  }

  function handlePlanChange(groupId: string, plan: string) {
    startTransition(async () => {
      await updateGroupPlan(groupId, plan)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Admin - Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários e planos
          </p>
        </div>
        <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
          <Shield className="mr-1.5 size-3" />
          SUPERADMIN
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total usuários</CardDescription>
            <CardTitle className="text-xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Superadmins</CardDescription>
            <CardTitle className="text-xl">
              {users.filter((u) => u.role === 'SUPERADMIN').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com grupo</CardDescription>
            <CardTitle className="text-xl">
              {users.filter((u) => u.groups.length > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum usuário encontrado</CardTitle>
            <CardDescription>Tente uma busca diferente.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const roleCfg = ROLE_LABELS[user.role] ?? ROLE_LABELS.USER
            const isSelf = user.id === currentUserId

            return (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  {/* User info */}
                  <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user.name ?? 'Sem nome'}
                        </p>
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">(você)</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email ?? 'Sem email'}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        Cadastro: {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user.id, v)}
                      disabled={isPending || isSelf}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Usuário</SelectItem>
                        <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Groups & Plans */}
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {user.groups.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sem grupo
                      </Badge>
                    ) : (
                      user.groups.map((g) => {
                        const planCfg = PLAN_LABELS[g.plan] ?? PLAN_LABELS.free
                        return (
                          <div key={g.groupId} className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {g.groupName}:
                            </span>
                            <Select
                              value={g.plan}
                              onValueChange={(v) => handlePlanChange(g.groupId, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="family">Family</SelectItem>
                                <SelectItem value="group">Group</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
