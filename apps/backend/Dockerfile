FROM node:18-alpine AS base

# Enable pnpm via Corepack
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace dependencies from monorepo root
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/
# Copy common package.json
COPY packages/common/package.json ./packages/common/

# Install dependencies
RUN pnpm install

# Development stage
FROM base AS development

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/common ./packages/common

# Set working directory to backend
WORKDIR /app/apps/backend

# Build common package from backend directory
RUN pnpm --filter @apps/common run build

# Generate Prisma client
RUN pnpx prisma@6.16.2 generate

# Install curl for healthchecks
RUN apk add --no-cache curl

# Expose port
EXPOSE 3000

# Start in dev mode
CMD ["sh", "-c", "pnpm --filter @apps/common run build && pnpm run start:dev"]

# Production stage
FROM base AS production

# Set production environment
ENV NODE_ENV=production

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/common ./packages/common

# Set working directory to backend
WORKDIR /app/apps/backend

# Build common package from backend directory
RUN pnpm --filter @apps/common run build

# Generate Prisma client
RUN pnpx prisma@6.16.2 generate

# Build the application
RUN pnpm build

# Install curl for healthchecks
RUN apk add --no-cache curl

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "run", "start:prod"]
