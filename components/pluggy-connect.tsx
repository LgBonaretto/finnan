'use client'

import { useState, useCallback } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { savePluggyItemId } from '@/actions/pluggy'
import { Button } from '@/components/ui/button'
import { Landmark } from 'lucide-react'

declare global {
  interface Window {
    PluggyConnect?: {
      init(options: {
        connectToken: string
        onSuccess: (data: { item: { id: string } }) => void
        onError: (error: { message?: string }) => void
        onClose: () => void
      }): { open: () => void }
    }
  }
}

export function PluggyConnectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const handleConnect = useCallback(async () => {
    if (!window.PluggyConnect) return
    setLoading(true)

    try {
      const res = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get connect token')
      const { accessToken } = await res.json()

      const pluggy = window.PluggyConnect.init({
        connectToken: accessToken,
        onSuccess: async (data) => {
          try {
            await savePluggyItemId(data.item.id)
            router.refresh()
          } catch (err) {
            console.error('Failed to save item:', err)
          } finally {
            setLoading(false)
          }
        },
        onError: (error) => {
          console.error('Pluggy Connect error:', error)
          setLoading(false)
        },
        onClose: () => {
          setLoading(false)
        },
      })

      pluggy.open()
    } catch (err) {
      console.error('Failed to open Pluggy Connect:', err)
      setLoading(false)
    }
  }, [router])

  return (
    <>
      <Script
        src="https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="lazyOnload"
      />
      <Button
        onClick={handleConnect}
        disabled={loading || !scriptLoaded}
        variant="outline"
      >
        <Landmark className="mr-2 size-4" />
        {loading ? 'Conectando...' : 'Conectar meu banco'}
      </Button>
    </>
  )
}
