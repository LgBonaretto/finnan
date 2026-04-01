import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. List all users with their groups
  const users = await prisma.user.findMany({
    include: {
      groupMembers: {
        include: { group: true },
        orderBy: { group: { createdAt: 'asc' } },
      },
    },
  })

  for (const user of users) {
    const groups = user.groupMembers.map((m) => m.group)
    console.log(`\nUser: ${user.name} (${user.email}) — ${groups.length} grupo(s)`)

    if (groups.length <= 1) {
      console.log('  Nenhum duplicado.')
      continue
    }

    // Keep the first (oldest), delete the rest
    const [keep, ...duplicates] = groups
    console.log(`  Mantendo: "${keep.name}" (${keep.id}, criado ${keep.createdAt.toISOString()})`)

    for (const dup of duplicates) {
      console.log(`  Deletando: "${dup.name}" (${dup.id}, criado ${dup.createdAt.toISOString()})`)
      // Cascade deletes members, categories, transactions, etc.
      await prisma.group.delete({ where: { id: dup.id } })
    }

    console.log(`  ${duplicates.length} grupo(s) removido(s).`)
  }

  console.log('\nLimpeza concluída.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
