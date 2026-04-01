'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function FinnanLogo({
  height = 32,
  variant,
  className,
}: {
  height?: number
  variant?: 'light' | 'dark'
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Determine which logo to show
  let src: string
  if (variant === 'dark') {
    src = '/logo-white.png'
  } else if (variant === 'light') {
    src = '/logo.png'
  } else if (!mounted) {
    // SSR/first render: show dark logo (most auth pages have dark bg)
    src = '/logo.png'
  } else {
    src = resolvedTheme === 'dark' ? '/logo-white.png' : '/logo.png'
  }

  return (
    <Image
      src={src}
      alt="Tukkan"
      width={Math.round(height * 3.5)}
      height={height}
      className={className}
      style={{ height, width: 'auto' }}
      priority
    />
  )
}
