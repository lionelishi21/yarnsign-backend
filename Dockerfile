# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Ensure production mode
ENV NODE_ENV=production

# Install dependencies only (cached if no change)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Ensure uploads directory exists and is writable (will be mounted as a volume in compose)
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 3001

CMD ["node", "index.js"] 