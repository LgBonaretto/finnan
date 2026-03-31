'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/actions/members'
import { Button } from '@/components/ui/button'

interface Props {
  token: string
}

export function InviteAccept({ token }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      try {
        await acceptInvite(token)
        router.push('/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao aceitar convite.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button onClick={handleAccept} disabled={isPending} size="lg">
        {isPending ? 'Entrando...' : 'Aceitar convite'}
      </Button>
    </div>
  )
}
