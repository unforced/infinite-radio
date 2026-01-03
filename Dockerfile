# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all package files first
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Copy shared (needed for TypeScript compilation)
COPY shared/ ./shared/

# Install all dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY client/ ./client/
COPY server/ ./server/

# Build client (Vite)
RUN cd client && npm run build

# Build server (TypeScript)
RUN cd server && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN cd server && npm install --omit=dev

# Copy shared types (needed at runtime for type imports)
COPY shared/ ./shared/

# Copy built assets from builder
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start the server
CMD ["node", "server/dist/index.js"]
