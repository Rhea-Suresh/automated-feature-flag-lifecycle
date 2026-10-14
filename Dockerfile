# Production-ready Dockerfile for Express application
# Base image: Official Node.js 20 LTS Alpine (minimal attack surface, ~50MB)
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Set production environment flag
ENV NODE_ENV=production

# Expose the agreed application port
EXPOSE 3000

# Copy package manifests first to optimize Docker layer caching
COPY package*.json ./

# Install only production dependencies cleanly
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code (excluded files handled by .dockerignore)
COPY . .

# Ensure files are owned by the non-root node user
RUN chown -R node:node /app

# Switch to the non-root 'node' user for security
USER node

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application using the NPM start script
CMD ["npm", "start"]
