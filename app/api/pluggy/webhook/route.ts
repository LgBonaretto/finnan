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
    // Return 200 even for invalid JSON so Pluggy registration succeeds
    return NextResponse.json({ ok: true })
  }

  const { event, itemId } = body

  // Always respond 200 immediately — Pluggy requires this within 5s
  // Process async in background for relevant events only
  if (event === 'item/updated' || event === 'transactions/updated') {
    if (itemId) {
      // Fire and forget — don't await
      processWebhook(itemId).catch((err) =>
        console.error('Pluggy webhook background sync failed:', err),
      )
    }
  }

  return NextResponse.json({ ok: true })
}

async function processWebhook(itemId: string) {
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

  if (!user || user.groupMembers.length === 0) return

  const groupId = user.groupMembers[0].groupId
  await syncTransactions(itemId, groupId)
}
