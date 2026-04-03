import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getConnectToken } from '@/lib/pluggy'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accessToken = await getConnectToken()
    return NextResponse.json({ accessToken })
  } catch (error) {
    console.error('Failed to create Pluggy connect token:', error)
    return NextResponse.json(
      { error: 'Failed to create connect token' },
      { status: 500 },
    )
  }
}
