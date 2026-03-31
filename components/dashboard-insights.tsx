'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  groupId: string
  month: string
}

export function DashboardInsights({ groupId, month }: Props) {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function fetchInsights() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, month }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInsights(data.insights)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Insights da IA</CardTitle>
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            AI
          </span>
        </div>
        <CardDescription>Análise automática das suas finanças</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Analisando seus dados...
          </div>
        )}
        {error && !loading && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Não foi possível gerar insights.
            </p>
            <Button size="sm" variant="outline" onClick={fetchInsights}>
              Tentar novamente
            </Button>
          </div>
        )}
        {insights && !loading && (
          <p className="text-sm leading-relaxed text-foreground">{insights}</p>
        )}
      </CardContent>
    </Card>
  )
}
