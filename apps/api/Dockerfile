FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install curl and openssl (required for Prisma on Alpine)
RUN apk add --no-cache curl openssl

FROM base AS dev
WORKDIR /app
COPY package.json .
COPY prisma ./prisma
# Install dependencies (Prisma postinstall will generate client from schema)
RUN pnpm install
# Regenerate Prisma client on every start so bind-mounted schema changes are picked up
CMD ["sh", "-c", "pnpm db:generate && pnpm dev"]

FROM base AS builder
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm db:generate
RUN pnpm build
RUN pnpm prune --prod

FROM base AS prod
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
# Copy diagnostic and verification scripts for production debugging
COPY --from=builder /app/diagnose-admin.js ./diagnose-admin.js
COPY --from=builder /app/diagnose-admin.ts ./diagnose-admin.ts
COPY --from=builder /app/verify-admin.ts ./verify-admin.ts
COPY --from=builder /app/verify-auth.ts ./verify-auth.ts
COPY --from=builder /app/verify-constraints.ts ./verify-constraints.ts
COPY --from=builder /app/verify-error-mapping.ts ./verify-error-mapping.ts
COPY --from=builder /app/verify-member-card.ts ./verify-member-card.ts
COPY --from=builder /app/verify-modules.ts ./verify-modules.ts
COPY --from=builder /app/verify-tx.ts ./verify-tx.ts
COPY --from=builder /app/test_api_create.ts ./test_api_create.ts

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
