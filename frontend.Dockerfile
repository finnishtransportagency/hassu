# syntax=docker.io/docker/dockerfile:1

# Template from https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

# Use AWS public ECR (mirrored from Docker Hub) to avoid 429 limits
# and benefit from improved performance
FROM public.ecr.aws/docker/library/node:20-alpine AS base

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
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# TODO - Copy only files that are needed for the build - was quite difficult task so skipped for now..
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments that NextJS expects
ARG NEXT_PUBLIC_VERSION
ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_VAYLA_EXTRANET_URL
ARG NEXT_PUBLIC_VELHO_BASE_URL
ARG NEXT_PUBLIC_AJANSIIRTO_SALLITTU
ARG NEXT_PUBLIC_REACT_APP_API_URL
ARG NEXT_PUBLIC_REACT_APP_API_KEY
ARG NEXT_PUBLIC_FRONTEND_DOMAIN_NAME
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_KEYCLOAK_DOMAIN
ARG NEXT_PUBLIC_EVK_ACTIVATION_DATE

# use separate next.config.js file to keep things as isolated as possible
RUN mv docker_next.config.js next.config.js

# Build the project
RUN \
  NEXT_PUBLIC_VERSION=${NEXT_PUBLIC_VERSION} \
  NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT} \
  NEXT_PUBLIC_VAYLA_EXTRANET_URL=${NEXT_PUBLIC_VAYLA_EXTRANET_URL} \
  NEXT_PUBLIC_VELHO_BASE_URL=${NEXT_PUBLIC_VELHO_BASE_URL} \
  NEXT_PUBLIC_AJANSIIRTO_SALLITTU=${NEXT_PUBLIC_AJANSIIRTO_SALLITTU} \
  NEXT_PUBLIC_REACT_APP_API_URL=${NEXT_PUBLIC_REACT_APP_API_URL} \
  NEXT_PUBLIC_REACT_APP_API_KEY=${NEXT_PUBLIC_REACT_APP_API_KEY} \
  NEXT_PUBLIC_FRONTEND_DOMAIN_NAME=${NEXT_PUBLIC_FRONTEND_DOMAIN_NAME} \
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID} \
  NEXT_PUBLIC_KEYCLOAK_DOMAIN=${NEXT_PUBLIC_KEYCLOAK_DOMAIN} \
  NEXT_PUBLIC_EVK_ACTIVATION_DATE=${NEXT_PUBLIC_EVK_ACTIVATION_DATE} \
  npm run build

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
# Grant write access to /app to be able to search and replace bundled env variables runtime
# Write access dropped in entrypoint.sh once done replacing
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app && \
    chmod -R u+w /app && \
    chown -R nextjs:nodejs /app/.next/cache && \
    chmod -R u+w /app/.next/cache

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
