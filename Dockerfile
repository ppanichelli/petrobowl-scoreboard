# ─────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (improves Docker layer caching)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including devDeps needed for Vite)
RUN npm ci

# Copy source files
COPY client/ ./client/
COPY server/ ./server/

# Build React app → outputs to server/public/
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production runtime (lean image)
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install ONLY production dependencies (no Vite, no devDeps)
RUN npm ci --omit=dev

# Copy server source code
COPY server/src/ ./server/src/

# Copy the built React app from Stage 1
COPY --from=builder /app/server/public/ ./server/public/

# Create data directory placeholder (real data comes from Docker volume at runtime)
RUN mkdir -p ./server/data

EXPOSE 3000

# On every start: run database migration (idempotent), then start the server
CMD ["sh", "-c", "node server/src/db/migrate.js && node server/src/index.js"]
