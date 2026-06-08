# --- Stage 1: Build Next.js Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Build Next.js
RUN npm run build

# --- Stage 2: Install Node.js Backend dependencies ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

# --- Final Stage: Run both services behind Caddy ---
FROM node:20-alpine
# Copy Caddy server binary from official lightweight image
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/bin/caddy

WORKDIR /app

# Copy Node.js backend files and dependencies
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend

# Copy built Next.js frontend files and production dependencies
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY frontend/package*.json ./frontend/
COPY frontend/src ./frontend/src

# Copy unified proxy config and startup script
COPY Caddyfile ./Caddyfile
COPY start.sh ./start.sh

# Make launcher executable
RUN chmod +x ./start.sh

# Expose Caddy's routing gateway port (Fly.io / Dokploy default mapping)
EXPOSE 8080

CMD ["./start.sh"]
