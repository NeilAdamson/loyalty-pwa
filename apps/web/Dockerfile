FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install curl for healthchecks
RUN apk add --no-cache curl

FROM base AS dev
WORKDIR /app
COPY package.json .
# Install dependencies
RUN pnpm install
# Startup
CMD ["pnpm", "dev", "--host"]

FROM base AS builder
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
# Build arguments
ARG VITE_API_BASE_URL
ARG VITE_API_URL
ARG VITE_APP_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

RUN pnpm build

FROM caddy:alpine AS prod
WORKDIR /app
COPY --from=builder /app/dist ./dist
# Serve files on port 80 internally. The root Caddy will proxy to this.
CMD ["caddy", "file-server", "--root", "dist", "--listen", ":80"]
