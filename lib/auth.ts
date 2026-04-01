import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma as never),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            groupMembers: {
              take: 1,
              orderBy: { joinedAt: 'asc' },
            },
          },
        })

        if (!user?.passwordHash) return null

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash,
        )

        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.groupMembers[0]?.role ?? null,
          groupId: user.groupMembers[0]?.groupId ?? null,
          userRole: user.role,
          onboardingCompleted: user.onboardingCompleted,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!
        token.role = ((user as Record<string, unknown>).role as string) ?? null
        token.groupId = ((user as Record<string, unknown>).groupId as string) ?? null
        token.userRole = ((user as Record<string, unknown>).userRole as string) ?? 'USER'
        token.onboardingCompleted = ((user as Record<string, unknown>).onboardingCompleted as boolean) ?? false
      }

      // Refresh from DB on every request to catch promotions and onboarding completion
      if (token.id && trigger !== 'signIn') {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, onboardingCompleted: true },
          })
          if (dbUser) {
            token.userRole = dbUser.role
            token.onboardingCompleted = dbUser.onboardingCompleted
          }
        } catch {
          // DB query failed — keep existing token values
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string | null
        session.user.groupId = token.groupId as string | null
        session.user.userRole = token.userRole as string
        session.user.onboardingCompleted = token.onboardingCompleted
      }
      return session
    },
  },
})
