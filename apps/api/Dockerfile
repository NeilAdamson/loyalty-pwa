FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install curl and openssl (required for Prisma on Alpine)
RUN apk add --no-cache curl openssl

FROM base AS dev
WORKDIR /app
COPY package.json .
# Install dependencies
RUN pnpm install
# Startup
CMD ["pnpm", "dev"]

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

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
