###############################################################
# EthicFlow — Backend Dockerfile
# Builds the Node.js / Express API for production.
# Runs Prisma migrations at startup, then starts the server.
###############################################################

FROM node:20-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S app && adduser -S app -G app
RUN apk add --no-cache openssl su-exec
# Install dependencies (includes devDeps so prisma CLI is available for migrations)
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci

# Generate Prisma client at build time
RUN npx prisma generate

# Copy application source
COPY src/ ./src/


# Hand ownership to non-root user for image layers.
RUN chown -R app:app /app

EXPOSE 5000

# Run migrations (idempotent) then start the server.
# For mounted volumes (/app/uploads, /app/generated), ensure ownership at runtime
# before dropping privileges to the non-root app user.
CMD ["sh", "-c", "mkdir -p /app/uploads /app/generated && chown -R app:app /app/uploads /app/generated && su-exec app node_modules/.bin/prisma migrate deploy && su-exec app node_modules/.bin/prisma db seed && exec su-exec app node src/index.js"]
