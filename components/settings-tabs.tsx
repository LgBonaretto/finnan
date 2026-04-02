'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { updateProfile, updateGroup } from '@/actions/auth'
import { inviteMember, removeMember, updateMemberRole } from '@/actions/members'
import {
  User,
  Mail,
  Shield,
  LogOut,
  Trash2,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Member = {
  userId: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  joinedAt: Date | string
}

interface Props {
  user: { id: string; name: string; email: string }
  group: { id: string; name: string } | null
  members: Member[]
  userRole: string | null
}

const roleLabels: Record<string, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
  child: 'Dependente',
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-red-500',
  'bg-yellow-500',
]

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getAvatarColor(name?: string | null): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function SettingsTabs({ user, group, members, userRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Profile
  const [profileName, setProfileName] = useState(user.name)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)

  // Group
  const [groupName, setGroupName] = useState(group?.name ?? '')
  const [groupMsg, setGroupMsg] = useState<string | null>(null)

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'child'>('member')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin' || isOwner

  function saveProfile() {
    startTransition(async () => {
      await updateProfile(profileName)
      setProfileMsg('Perfil atualizado!')
      router.refresh()
      setTimeout(() => setProfileMsg(null), 3000)
    })
  }

  function saveGroup() {
    if (!group) return
    startTransition(async () => {
      await updateGroup(group.id, groupName)
      setGroupMsg('Grupo atualizado!')
      router.refresh()
      setTimeout(() => setGroupMsg(null), 3000)
    })
  }

  function handleInvite() {
    if (!group) return
    setInviteMsg(null)
    setInviteUrl(null)
    startTransition(async () => {
      try {
        const result = await inviteMember(group.id, inviteEmail, inviteRole)
        if ('error' in result) {
          setInviteMsg(result.error as string)
        } else {
          setInviteUrl(result.inviteUrl)
          setInviteEmail('')
        }
      } catch (err) {
        setInviteMsg(err instanceof Error ? err.message : 'Erro ao convidar.')
      }
    })
  }

  function handleRemove(userId: string) {
    if (!group) return
    startTransition(async () => {
      await removeMember(group.id, userId)
      router.refresh()
    })
  }

  function handleRoleChange(userId: string, role: string) {
    if (!group) return
    startTransition(async () => {
      await updateMemberRole(group.id, userId, role as 'admin' | 'member' | 'child')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seu perfil e grupo
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="group">Grupo</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar card */}
          <Card>
            <CardContent className="flex items-center gap-5 py-6">
              <Avatar className="size-20">
                <AvatarFallback
                  className={`text-2xl font-bold text-white ${getAvatarColor(user.name)}`}
                >
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {user.name || 'Sem nome'}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {userRole && (
                  <Badge variant="secondary" className="mt-1">
                    {roleLabels[userRole] ?? userRole}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                Dados pessoais
              </CardTitle>
              <CardDescription>Atualize seu nome de exibição</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado.
                </p>
              </div>
              {profileMsg && (
                <p className="text-sm text-green-600">{profileMsg}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={saveProfile} disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Group ── */}
        <TabsContent value="group" className="space-y-6">
          {!group ? (
            <Card>
              <CardHeader>
                <CardTitle>Nenhum grupo</CardTitle>
                <CardDescription>
                  Você ainda não faz parte de nenhum grupo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => router.push('/groups/new')}
                >
                  Criar grupo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group name */}
              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>Dados do grupo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Nome do grupo</Label>
                      <Input
                        id="group-name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                    </div>
                    {groupMsg && (
                      <p className="text-sm text-green-600">{groupMsg}</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button onClick={saveGroup} disabled={isPending}>
                      Salvar
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Membros</CardTitle>
                  <CardDescription>
                    {members.length}{' '}
                    {members.length === 1 ? 'membro' : 'membros'} no grupo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <Avatar className="size-9">
                          <AvatarFallback
                            className={`text-xs font-medium text-white ${getAvatarColor(m.name)}`}
                          >
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {m.name ?? 'Sem nome'}
                            {m.userId === user.id && (
                              <span className="ml-1 text-muted-foreground">
                                (você)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        </div>

                        {isOwner && m.role !== 'owner' && m.userId !== user.id ? (
                          <Select
                            value={m.role}
                            onValueChange={(v) =>
                              handleRoleChange(m.userId, v)
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Membro</SelectItem>
                              <SelectItem value="child">Dependente</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">
                            {roleLabels[m.role] ?? m.role}
                          </Badge>
                        )}

                        {isOwner && m.role !== 'owner' && m.userId !== user.id && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemove(m.userId)}
                            disabled={isPending}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invite */}
              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>Convidar membro</CardTitle>
                    <CardDescription>
                      Gere um link de convite válido por 7 dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="invite-email">
                          Email (opcional)
                        </Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="email@exemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Papel</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(v) =>
                            setInviteRole(v as 'admin' | 'member' | 'child')
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="child">Dependente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {inviteMsg && (
                      <p className="text-sm text-destructive">{inviteMsg}</p>
                    )}

                    {inviteUrl && (
                      <div className="space-y-2">
                        <Label>Link de convite</Label>
                        <div className="flex gap-2">
                          <Input value={inviteUrl} readOnly className="bg-muted" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteUrl)
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Válido por 7 dias.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleInvite} disabled={isPending}>
                      Gerar convite
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Preferences ── */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moeda e formato</CardTitle>
              <CardDescription>
                Configurações regionais do app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select defaultValue="BRL">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">Real (R$)</SelectItem>
                    <SelectItem value="USD">Dólar (US$)</SelectItem>
                    <SelectItem value="EUR">Euro (&euro;)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A moeda é definida por grupo. Em breve.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Formato de data</Label>
                <Select defaultValue="dd/mm/yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
                    <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Em breve.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Controle quais alertas você recebe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Alertas de orçamento
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notificar quando atingir 80% ou 100%
                  </p>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Novas transações
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notificar quando membros adicionarem transações
                  </p>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Metas concluídas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notificar quando uma meta for atingida
                  </p>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Account ── */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Plano e assinatura
              </CardTitle>
              <CardDescription>
                Gerencie o plano do seu grupo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/settings/billing">Ver planos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" />
                Segurança
              </CardTitle>
              <CardDescription>
                Gerencie acesso à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" disabled>
                Alterar senha
              </Button>
              <p className="text-xs text-muted-foreground">
                Em breve.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="size-4" />
                Sessão
              </CardTitle>
              <CardDescription>
                Gerencie sua sessão atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => signOut({ redirectTo: '/login' })}
              >
                Sair da conta
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="size-4" />
                Zona de perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis na sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ao excluir sua conta, todos os seus dados serão permanentemente
                removidos. Esta ação não pode ser desfeita.
              </p>
              <Button variant="destructive" disabled>
                Excluir conta
              </Button>
              <p className="text-xs text-muted-foreground">
                Em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
