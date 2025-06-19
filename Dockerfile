FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --production && npm cache clean --force

COPY .env .env

# Create directories and set permissions
RUN mkdir -p /app/data/chat_history /app/logs \
    && chown -R node:node /app

USER node

CMD ["node", "dist/index.js"] 