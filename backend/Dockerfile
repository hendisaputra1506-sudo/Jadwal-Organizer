# Stage 1: Build stage using Node 20 Slim (Debian-based with full OpenSSL & glibc support)
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL and CA certificates for Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma Client & compile TypeScript to dist/
RUN npm run build

# Stage 2: Production Runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL and CA certificates in runner for Prisma runtime engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev

# Generate Prisma Client in the runner container
RUN npx prisma generate

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Railway injects dynamic PORT (e.g. 8080)
EXPOSE 8080

CMD ["node", "dist/server.js"]
