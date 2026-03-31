import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getInviteInfo } from '@/actions/members'
import { InviteAccept } from '@/components/invite-accept'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{ token: string }>
}

const roleLabels: Record<string, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
  child: 'Dependente',
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=/invite/${token}`)
  }

  const info = await getInviteInfo(token)

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Convite não encontrado</CardTitle>
            <CardDescription>
              Este link de convite é inválido ou não existe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/dashboard">Ir para o dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (info.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Convite indisponível</CardTitle>
            <CardDescription>
              {info.reason === 'used'
                ? 'Este convite já foi utilizado.'
                : 'Este convite expirou.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/dashboard">Ir para o dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Convite para grupo</CardTitle>
          <CardDescription>
            Você foi convidado para participar do grupo{' '}
            <span className="font-semibold text-foreground">
              {info.groupName}
            </span>{' '}
            como{' '}
            <span className="font-semibold text-foreground">
              {roleLabels[info.role!] ?? info.role}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <InviteAccept token={token} />
        </CardContent>
      </Card>
    </div>
  )
}
