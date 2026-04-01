'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { FinnanLogo } from '@/components/finnan-logo'

import { acceptInvite, declineInvite } from '@/actions/members'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
  child: 'Dependente',
}

type Props =
  | { token: string; status: 'not-found' }
  | { token: string; status: 'expired'; message: string }
  | {
      token: string
      status: 'valid'
      groupName: string
      inviterName: string
      role: string
      isLoggedIn: boolean
    }

export function InviteClient(props: Props) {
  const [state, setState] = useState<'idle' | 'accepting' | 'declining' | 'accepted' | 'declined' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (props.status !== 'valid') return

    if (!props.isLoggedIn) {
      window.location.href = `/register?invite=${props.token}`
      return
    }

    setState('accepting')
    setError(null)

    try {
      const result = await acceptInvite(props.token)
      if (result.error) {
        setError(result.error)
        setState('error')
        return
      }
      setState('accepted')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch {
      setError('Erro ao aceitar convite. Tente novamente.')
      setState('error')
    }
  }

  async function handleDecline() {
    setState('declining')
    setError(null)

    try {
      const result = await declineInvite(props.token)
      if (result.error) {
        setError(result.error)
        setState('error')
        return
      }
      setState('declined')
    } catch {
      setError('Erro ao recusar convite.')
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <FinnanLogo height={40} />
        </div>

        {/* Not found / expired */}
        {(props.status === 'not-found' || props.status === 'expired') && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <CardTitle className="text-xl font-bold">
                Convite indisponível
              </CardTitle>
              <CardDescription>
                {props.status === 'not-found'
                  ? 'Este link de convite não existe ou foi removido.'
                  : props.message}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Ir para o login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Accepted state */}
        {props.status === 'valid' && state === 'accepted' && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold">
                Convite aceito!
              </CardTitle>
              <CardDescription>
                Você agora faz parte do grupo <strong>{props.groupName}</strong>.
                Redirecionando...
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Declined state */}
        {props.status === 'valid' && state === 'declined' && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
                <XCircle className="size-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">
                Convite recusado
              </CardTitle>
              <CardDescription>
                Você recusou o convite para o grupo{' '}
                <strong>{props.groupName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Ir para o login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Valid invite - action UI */}
        {props.status === 'valid' && state !== 'accepted' && state !== 'declined' && (
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">
                Convite para grupo
              </CardTitle>
              <CardDescription>
                <strong className="text-foreground">{props.inviterName}</strong>{' '}
                te convidou para o grupo
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/50 p-4 text-center">
                <p className="text-lg font-semibold text-foreground">
                  {props.groupName}
                </p>
                <p className="text-sm text-muted-foreground">
                  como {ROLE_LABELS[props.role] ?? props.role}
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!props.isLoggedIn && (
                <p className="text-center text-xs text-muted-foreground">
                  Você precisará criar uma conta ou fazer login para aceitar o
                  convite.
                </p>
              )}
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={state === 'accepting' || state === 'declining'}
              >
                {state === 'declining' ? 'Recusando...' : 'Recusar'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={state === 'accepting' || state === 'declining'}
              >
                {state === 'accepting' ? 'Aceitando...' : 'Aceitar convite'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
