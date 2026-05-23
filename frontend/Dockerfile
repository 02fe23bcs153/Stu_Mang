# --- Stage 1: Build React App ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dev and production dependencies
RUN npm ci

# Copy full application codebase
COPY . .

# Compile and build optimized static assets
RUN npm run build

# --- Stage 2: Serve with Production-Grade Nginx ---
FROM nginx:1.25-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
