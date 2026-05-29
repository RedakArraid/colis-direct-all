FROM node:18-alpine

WORKDIR /app

# Install system dependencies (curl for healthcheck, bash for scripts if needed)
RUN apk add --no-cache curl bash

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm ci --include=dev || npm install

# Copy source code
COPY . .

# Build TypeScript (requires devDependencies)
RUN npm run build

# Remove devDependencies after build to reduce image size (optional but recommended)
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]

