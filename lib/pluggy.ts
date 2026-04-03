import { PluggyClient } from 'pluggy-sdk'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

function createClient() {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET must be set')
  }
  return new PluggyClient({ clientId, clientSecret })
}

export async function getPluggyApiKey(): Promise<string> {
  const client = createClient()
  const result = await client.createConnectToken('')
  return result.accessToken
}

export async function getConnectToken(userId: string): Promise<string> {
  const client = createClient()
  const result = await client.createConnectToken(userId)
  return result.accessToken
}

export async function syncTransactions(itemId: string, groupId: string) {
  const client = createClient()

  const accounts = await client.fetchAccounts(itemId)
  let totalSynced = 0

  for (const account of accounts.results) {
    const transactions = await client.fetchAllTransactions(account.id)

    for (const tx of transactions) {
      const existingMeta = await prisma.transaction.findFirst({
        where: {
          groupId,
          deletedAt: null,
          metadata: {
            path: ['pluggyTransactionId'],
            equals: tx.id,
          },
        },
      })

      if (existingMeta) continue

      const amount = Math.abs(tx.amount)
      const type = tx.amount >= 0 ? 'income' : 'expense'

      const owner = await prisma.groupMember.findFirst({
        where: { groupId, role: 'owner' },
        select: { userId: true },
      })

      if (!owner) continue

      await prisma.transaction.create({
        data: {
          groupId,
          userId: owner.userId,
          type,
          amount: new Prisma.Decimal(amount.toFixed(2)),
          description: tx.description || tx.descriptionRaw || 'Transação bancária',
          date: new Date(tx.date),
          metadata: {
            pluggyTransactionId: tx.id,
            pluggyAccountId: account.id,
            pluggyItemId: itemId,
            source: 'pluggy',
          },
        },
      })
      totalSynced++
    }
  }

  return { synced: totalSynced }
}
