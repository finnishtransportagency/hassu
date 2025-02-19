# syntax=docker.io/docker/dockerfile:1

# Pohja peräisin https://github.com/vercel/next.js/blob/v12.3.4/examples/with-docker/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /my-app

# Install dependencies based on the preferred package manager
COPY ./my-app/package.json ./my-app/yarn.lock* ./my-app/package-lock.json* ./my-app/pnpm-lock.yaml* ./my-app/.npmrc* ./
RUN npm ci


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /my-app
COPY --from=deps /my-app/node_modules ./node_modules
COPY ./my-app .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /my-app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /my-app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /my-app/.next ./.next
# Vaihda .next kansiokopiointi tähän, jos standalone standalone outputin saa toimimaan
# COPY --from=builder --chown=nextjs:nodejs /my-app/.next/static ./.next/static
# COPY --from=builder --chown=nextjs:nodejs /my-app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]