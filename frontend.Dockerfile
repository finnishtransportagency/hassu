# syntax=docker.io/docker/dockerfile:1

# Template from https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

# Use AWS public ECR (mirrored from Docker Hub) to avoid 429 limits
# and benefit from improved performance
FROM public.ecr.aws/docker/library/node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./

# Mount .npmrc config containing proper token to use private npm registry
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --ignore-scripts

# Rebuild the source code only when needed
FROM base AS builder

ARG ENVIRONMENT
ENV ENVIRONMENT=${ENVIRONMENT}

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# TODO - Copy only files that are needed for the build - was quite difficult task so skipped for now..
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

# Build the project
RUN npm run build

# Build the project
#RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

# Related also to the above sharp issue, but in our case seems to work without this.
# ENV NEXT_SHARP_PATH=/app/node_modules/sharp

# Create user and group for running Next.js (non-root user)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the necessary files from the builder image
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Next.js writes at least images to .next/cache -> need to ensure write permissions there
# Ensure the files are owned by nextjs:nodejs
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app/.next/cache && \
    chmod -R u+w /app/.next/cache && \
    chown -R nextjs:nodejs /app/public/assets

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]

CMD ["node", "server.js"]
