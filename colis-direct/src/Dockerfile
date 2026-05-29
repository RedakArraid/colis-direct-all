# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash

# Build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files first for better caching
# Note: context is project root, paths are relative to context
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps --include=dev || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application (requires devDependencies like vite, typescript, etc.)
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

