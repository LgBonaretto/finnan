'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PluggyConnect } from 'react-pluggy-connect'
import { savePluggyItemId } from '@/actions/pluggy'
import { Button } from '@/components/ui/button'
import { Landmark } from 'lucide-react'

export function PluggyConnectButton() {
  const router = useRouter()
  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConnect = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get connect token')
      const { accessToken } = await res.json()
      setConnectToken(accessToken)
    } catch (err) {
      console.error('Failed to get token:', err)
      setLoading(false)
    }
  }, [])

  return (
    <>
      <Button onClick={handleConnect} disabled={loading} variant="outline">
        <Landmark className="mr-2 size-4" />
        {loading ? 'Conectando...' : 'Conectar meu banco'}
      </Button>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          onSuccess={async (data) => {
            try {
              await savePluggyItemId(data.item.id)
              router.refresh()
            } catch (err) {
              console.error('Failed to save item:', err)
            } finally {
              setConnectToken(null)
              setLoading(false)
            }
          }}
          onError={(error) => {
            console.error('Pluggy Connect error:', error)
            setConnectToken(null)
            setLoading(false)
          }}
          onClose={() => {
            setConnectToken(null)
            setLoading(false)
          }}
        />
      )}
    </>
  )
}
