# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build Vite application with optional API base URL override
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Production stage
FROM nginx:alpine

ENV BACKEND_URL=http://backend:5000
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL

# Copy nginx template for automated envsubst on container startup
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
