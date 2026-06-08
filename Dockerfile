# --- Base Node Image ---
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependency Stage ---
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# --- Build Stage ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# --- Runtime Production Stage ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create secure system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy runtime assets and build outputs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
