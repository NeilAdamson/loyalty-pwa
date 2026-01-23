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
