# Multi-stage Dockerfile for Node.js Backend
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS dev
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create production build (if needed for any build steps)
RUN npm run build 2>/dev/null || echo "No build script found"

# Production stage
FROM base AS production

# Create app directory with proper permissions
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads temp && chown -R nodeuser:nodejs logs uploads temp

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]
