FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS='--max-old-space-size=2048'
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && node server.js"
