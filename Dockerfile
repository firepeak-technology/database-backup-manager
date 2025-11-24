# Multi-stage build for production
FROM node:20-alpine AS frontend-builder

# Install dependencies for frontend build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

# Build frontend
COPY frontend/ ./
RUN npm run build

# Production image
FROM node:20-alpine

# Install database clients
RUN apk add --no-cache \
    postgresql-client \
    mysql-client \
    tzdata

# Set timezone (adjust as needed)
ENV TZ=Europe/Brussels

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S -u 1001 -G appuser appuser

# Create directories
WORKDIR /app
RUN mkdir -p configs backups logs && \
    chown -R appuser:appuser /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy server code
COPY server.js ./
COPY .env.template ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./public

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/auth/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
