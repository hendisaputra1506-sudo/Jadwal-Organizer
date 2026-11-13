# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build Vite SPA with production config
RUN npm run build

# Production web server stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
