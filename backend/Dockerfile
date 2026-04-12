###############################################################
# EthicFlow — Backend Dockerfile
# Builds the Node.js / Express API for production.
# Runs Prisma migrations at startup, then starts the server.
###############################################################

FROM node:20-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Install dependencies (includes devDeps so prisma CLI is available for migrations)
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci

# Generate Prisma client at build time
RUN npx prisma generate

# Copy application source
COPY src/ ./src/

# Hand ownership to non-root user
RUN chown -R app:app /app
USER app

EXPOSE 5000

# Run migrations (idempotent) then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node src/index.js"]
