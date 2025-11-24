# Multi-stage build for production
FROM node:23-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Production image
FROM node:23-alpine

RUN apk add --no-cache \
    postgresql-client \
    mysql-client \
    tzdata

ENV TZ=Europe/Brussels

RUN addgroup -g 1001 -S appuser && \
    adduser -S -u 1001 -G appuser appuser

WORKDIR /app
RUN mkdir -p configs backups logs && \
    chown -R appuser:appuser /app

COPY package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force

COPY server.js ./
COPY .env.template ./

COPY --from=frontend-builder /app/frontend/dist ./public

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/auth/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
