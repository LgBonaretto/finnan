'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Briefcase,
  Heart,
  Plus,
  ArrowRight,
  Check,
} from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { createGroup } from '@/actions/groups'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const GROUP_TYPES = [
  {
    value: 'family',
    label: 'Família',
    description: 'Gerencie finanças com sua família',
    icon: Home,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    value: 'couple',
    label: 'Casal',
    description: 'Controle de gastos a dois',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    value: 'roommates',
    label: 'República',
    description: 'Divida despesas com colegas',
    icon: Users,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    value: 'business',
    label: 'Empresa',
    description: 'Finanças empresariais',
    icon: Briefcase,
    gradient: 'from-amber-500 to-orange-600',
  },
]

const ROLE_CONFIG: Record<string, { label: string; class: string }> = {
  owner: {
    label: 'Dono',
    class: 'border-primary/30 bg-primary/10 text-primary',
  },
  admin: {
    label: 'Admin',
    class: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  member: {
    label: 'Membro',
    class: 'border-border bg-muted text-muted-foreground',
  },
  child: {
    label: 'Dependente',
    class: 'border-border bg-muted text-muted-foreground',
  },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getGroupType(type: string) {
  return GROUP_TYPES.find((t) => t.value === type) ?? GROUP_TYPES[0]
}

function GroupIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const config = getGroupType(type)
  const Icon = config.icon
  const sizeClasses = {
    sm: 'size-8 rounded-lg',
    md: 'size-12 rounded-2xl shadow-lg',
    lg: 'size-16 rounded-2xl shadow-lg',
  }
  const iconSizes = { sm: 'size-4', md: 'size-6', lg: 'size-8' }

  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${config.gradient} ${sizeClasses[size]}`}>
      <Icon className={`${iconSizes[size]} text-white`} />
    </div>
  )
}

type Group = {
  id: string
  name: string
  type: string
  role: string
  memberCount: number
  memberNames: string[]
  monthExpense: number
}

export function GroupsClient({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('family')
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!groupName.trim()) {
      setError('Digite um nome para o grupo.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const result = await createGroup({
        name: groupName.trim(),
        type: selectedType,
      })
      if ('error' in result) {
        setError(result.error as string)
        setCreating(false)
        return
      }
      setDialogOpen(false)
      setGroupName('')
      router.refresh()
    } catch {
      setError('Erro ao criar grupo.')
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Grupos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus grupos e finanças compartilhadas
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Novo grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar novo grupo</DialogTitle>
              <DialogDescription>
                Escolha o tipo e dê um nome ao seu grupo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Type selection */}
              <div className="space-y-2">
                <Label>Tipo de grupo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GROUP_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        selectedType === type.value
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {selectedType === type.value && (
                        <div className="absolute right-2 top-2">
                          <Check className="size-3.5 text-primary" />
                        </div>
                      )}
                      <GroupIcon type={type.value} size="sm" />
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {type.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Nome do grupo</Label>
                <Input
                  placeholder={
                    selectedType === 'family'
                      ? 'Ex: Família Silva'
                      : selectedType === 'couple'
                        ? 'Ex: João & Maria'
                        : selectedType === 'roommates'
                          ? 'Ex: Apt 302'
                          : 'Ex: Minha empresa'
                  }
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={creating || !groupName.trim()}
                className="w-full"
              >
                {creating ? 'Criando...' : 'Criar grupo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader className="py-12 text-center">
            <div className="mx-auto mb-3">
              <GroupIcon type="family" size="lg" />
            </div>
            <CardTitle className="text-lg">
              Você ainda não tem grupos
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Crie um grupo para começar a controlar suas finanças em família ou
              com amigos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Criar meu primeiro grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const roleConfig = ROLE_CONFIG[group.role] ?? ROLE_CONFIG.member
            const visibleMembers = group.memberNames.slice(0, 3)
            const extraCount = group.memberCount - visibleMembers.length

            return (
              <Card
                key={group.id}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <GroupIcon type={group.type} />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {group.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {getGroupType(group.type).label}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={roleConfig.class}
                    >
                      {roleConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <div className="px-6">
                  <Separator />
                </div>

                <CardContent className="pt-3">
                  {/* Members row */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {visibleMembers.map((name, i) => (
                          <Avatar
                            key={i}
                            className="size-7 border-2 border-background"
                          >
                            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {extraCount > 0 && (
                          <Avatar className="size-7 border-2 border-background">
                            <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                              +{extraCount}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {group.memberCount}{' '}
                        {group.memberCount === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>
                  </div>

                  {/* Month expense */}
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      Gasto no mês
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatMoney(group.monthExpense)}
                    </span>
                  </div>

                  {/* Action */}
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm"
                    onClick={() => router.push('/dashboard')}
                  >
                    Acessar
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
