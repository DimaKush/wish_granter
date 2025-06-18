FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

# Copy locally built dist
COPY dist ./dist
COPY .env .env

# Create directories and set permissions
RUN mkdir -p /app/data/chat_history /app/logs \
    && chown -R node:node /app

USER node

CMD ["node", "dist/index.js"] 