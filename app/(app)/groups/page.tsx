import Link from 'next/link'
import { getGroups } from '@/actions/groups'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const roleLabels: Record<string, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
  child: 'Dependente',
}

export default async function GroupsPage() {
  const groups = await getGroups()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
          <p className="text-muted-foreground">
            Gerencie seus grupos familiares e compartilhados
          </p>
        </div>
        <Button asChild>
          <Link href="/groups/new">Criar novo grupo</Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <CardTitle>Nenhum grupo ainda</CardTitle>
            <CardDescription>
              Crie seu primeiro grupo para começar a gerenciar finanças em conjunto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/groups/new">Criar primeiro grupo</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{group.name}</CardTitle>
                  <Badge variant="secondary">
                    {roleLabels[group.role] ?? group.role}
                  </Badge>
                </div>
                <CardDescription>
                  {group.type === 'family' ? 'Família' : 'Grupo'} &middot;{' '}
                  {group.memberCount}{' '}
                  {group.memberCount === 1 ? 'membro' : 'membros'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
