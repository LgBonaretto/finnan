'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-muted">
            <WifiOff className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Sem conexão</CardTitle>
          <CardDescription>
            Verifique sua internet e tente novamente.
            Suas alterações serão sincronizadas quando a conexão voltar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => typeof window !== 'undefined' && window.location.reload()}
            className="w-full"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
