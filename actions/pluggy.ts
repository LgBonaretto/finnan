'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PluggyClient } from 'pluggy-sdk'
import { syncTransactions } from '@/lib/pluggy'

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

function createClient() {
  return new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID!,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
  })
}

export async function savePluggyItemId(itemId: string) {
  const user = await requireUser()

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pluggyItemIds: true },
  })

  if (existing?.pluggyItemIds.includes(itemId)) return { success: true }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pluggyItemIds: {
        push: itemId,
      },
    },
  })

  return { success: true }
}

export type ConnectedBank = {
  itemId: string
  connectorName: string
  connectorLogo: string | null
  status: string
  lastUpdated: string | null
}

export async function getConnectedBanks(): Promise<ConnectedBank[]> {
  const user = await requireUser()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pluggyItemIds: true },
  })

  if (!dbUser?.pluggyItemIds.length) return []

  const client = createClient()
  const banks: ConnectedBank[] = []

  for (const itemId of dbUser.pluggyItemIds) {
    try {
      const item = await client.fetchItem(itemId)
      banks.push({
        itemId,
        connectorName: item.connector?.name ?? 'Banco desconhecido',
        connectorLogo: item.connector?.imageUrl ?? null,
        status: item.status,
        lastUpdated: (item.lastUpdatedAt ?? item.updatedAt)?.toString() ?? null,
      })
    } catch {
      banks.push({
        itemId,
        connectorName: 'Banco desconhecido',
        connectorLogo: null,
        status: 'ERROR',
        lastUpdated: null,
      })
    }
  }

  return banks
}

export async function disconnectBank(itemId: string) {
  const user = await requireUser()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pluggyItemIds: true },
  })

  if (!dbUser?.pluggyItemIds.includes(itemId)) {
    throw new Error('Item não encontrado.')
  }

  const client = createClient()
  try {
    await client.deleteItem(itemId)
  } catch {
    // Item may already be deleted on Pluggy side
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pluggyItemIds: dbUser.pluggyItemIds.filter((id) => id !== itemId),
    },
  })

  return { success: true }
}

export async function syncBankTransactions(itemId: string) {
  const user = await requireUser()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pluggyItemIds: true,
      groupMembers: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        select: { groupId: true },
      },
    },
  })

  if (!dbUser?.pluggyItemIds.includes(itemId)) {
    throw new Error('Item não encontrado.')
  }

  if (!dbUser.groupMembers.length) {
    throw new Error('Nenhum grupo encontrado.')
  }

  const groupId = dbUser.groupMembers[0].groupId
  const result = await syncTransactions(itemId, groupId)
  return { success: true, synced: result.synced }
}
