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

# Define arguments
ARG CODE_ARTIFACT_DOMAIN
ARG ACCOUNT_ID
ARG AWS_REGION
ARG NPM_SCOPE
ARG NPM_REGISTRY

# Configure npm authentication
# Using heredoc we avoid print
RUN --mount=type=secret,id=code_artifact_token \
    TOKEN=$(cat /run/secrets/code_artifact_token) && \
    cat <<EOF > ~/.npmrc
${NPM_SCOPE}:registry=https://${CODE_ARTIFACT_DOMAIN}-${ACCOUNT_ID}.d.codeartifact.${AWS_REGION}.amazonaws.com/npm/${NPM_REGISTRY}/
//${CODE_ARTIFACT_DOMAIN}-${ACCOUNT_ID}.d.codeartifact.${AWS_REGION}.amazonaws.com/npm/${NPM_REGISTRY}/:_authToken=${TOKEN}
EOF

RUN npm ci --ignore-scripts

# Root cause behind this was the standalone mode of Next.js throws:
# Error: 'sharp' is required to be installed in standalone mode for the image optimization to function correctly
# There is a lot of discussion around this issue, but following seems to tackle issue for now.
# Newer Next.js versions might have this issue resolved based on discussions around the issue.
# Traces for this solution:
# https://github.com/lovell/sharp/issues/3877#issuecomment-2088102017 
# https://sharp.pixelplumbing.com/install#cross-platform
# also among issues the version 0.32.6 of sharp works most likely so hence the version.
# Had issues when sharp was installed on host os level hence installation here inside the Dockerfile. 
RUN npm install --cpu=x64 --os=linux --libc=musl sharp@0.32.6

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

RUN mv middleware.ts src/

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
