import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncTransactions } from '@/lib/pluggy'

type PluggyWebhookPayload = {
  event: string
  id: string
  itemId: string
}

export async function POST(request: NextRequest) {
  let body: PluggyWebhookPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, itemId } = body

  if (event !== 'item/updated' && event !== 'transactions/updated') {
    return NextResponse.json({ ok: true })
  }

  if (!itemId) {
    return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { pluggyItemIds: { has: itemId } },
    include: {
      groupMembers: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        select: { groupId: true },
      },
    },
  })

  if (!user || user.groupMembers.length === 0) {
    return NextResponse.json({ error: 'User or group not found for itemId' }, { status: 404 })
  }

  const groupId = user.groupMembers[0].groupId

  try {
    const result = await syncTransactions(itemId, groupId)
    return NextResponse.json({ ok: true, synced: result.synced })
  } catch (error) {
    console.error('Pluggy webhook sync failed:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
