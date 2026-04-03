'use client'

import { useState, useCallback, useEffect } from 'react'
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

function loadPluggyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.PluggyConnect !== 'undefined') {
      resolve()
      return
    }
    const existing = document.querySelector('script[src*="pluggy-connect"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function PluggyConnectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPluggyScript().catch(console.error)
  }, [])

  const handleConnect = useCallback(async () => {
    setLoading(true)
    try {
      await loadPluggyScript()
      const res = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get connect token')
      const { accessToken } = await res.json()

      const pluggy = window.PluggyConnect!.init({
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
    <Button onClick={handleConnect} disabled={loading} variant="outline">
      <Landmark className="mr-2 size-4" />
      {loading ? 'Conectando...' : 'Conectar meu banco'}
    </Button>
  )
}
