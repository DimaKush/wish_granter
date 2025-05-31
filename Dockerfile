FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist
COPY .env .env

# Create directories and set permissions
RUN mkdir -p /app/data/chat_history /app/logs \
    && chown -R node:node /app

USER node

CMD ["node", "dist/index.js"] 