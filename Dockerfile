# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for compilation
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build both client and server
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist

# Expose the server port (8080 for Cloud Run)
EXPOSE 8080

# Start server directly with Node for fast signal handling & zero overhead
CMD ["node", "dist/index.cjs"]
