# Build & Runtime stage using lightweight Node Alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma client and compile TypeScript to dist/
RUN npm run build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --only=production
RUN npx prisma generate

# Copy built code from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
