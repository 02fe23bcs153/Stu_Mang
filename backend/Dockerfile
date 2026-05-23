# Use a secure, lightweight Node.js Debian-based slim image
FROM node:20-slim

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Create application directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY src/ ./src/

# Expose backend REST API port
EXPOSE 5000

# Run backend application
CMD [ "node", "src/index.js" ]
