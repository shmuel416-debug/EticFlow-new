###############################################################
# EthicFlow — Frontend Dockerfile
# Two-stage build:
#   Stage 1 (builder): Node.js builds the Vite React app
#   Stage 2 (runner):  nginx serves the static dist + proxies /api
#
# Required env var at runtime: BACKEND_URL
#   e.g. https://ethicflow-api-xxxx.up.railway.app
###############################################################

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the production Vite bundle.
# VITE_API_URL is intentionally left as /api (relative) — nginx
# proxies those requests to the backend at runtime.
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────
FROM nginx:alpine

# Copy compiled assets from the build stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template (${BACKEND_URL} is substituted at startup)
COPY nginx.conf /tmp/nginx.conf.template

EXPOSE 80

# Substitute BACKEND_URL into the nginx config then start nginx.
# Template is kept in /tmp (not /etc/nginx/templates) to prevent
# nginx's built-in entrypoint from running envsubst on ALL vars,
# which would corrupt nginx's own $http_host, $uri, etc.
CMD ["sh", "-c", "envsubst '$BACKEND_URL' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]