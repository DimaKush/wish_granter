#!/bin/bash

if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "Error: .env file not found"
    exit 1
fi

if [ -z "$DROPLET_IP" ]; then
    echo "Error: DROPLET_IP not set in .env"
    exit 1
fi

if [ -z "$SSH_KEY_PATH" ]; then
    echo "Error: SSH_KEY_PATH not set in .env"
    exit 1
fi

if [ -z "$BOT_TOKEN" ] || [ -z "$ANTHROPIC_API_KEY" ] || [ -z "$ADMIN_TELEGRAM_ID" ]; then
    echo "Error: Required bot variables not set in .env"
    exit 1
fi

SSH_KEY="$SSH_KEY_PATH"
REMOTE_DIR="/root/telegram_bot"
USER="root"
IMAGE_NAME="telegram_bot:latest"

echo "🔨 Building Docker image locally..."
docker build -t $IMAGE_NAME .

echo "📦 Saving image to tar..."
docker save $IMAGE_NAME > telegram_bot.tar

echo "🚀 Deploying to $DROPLET_IP..."

# Create remote directory if not exists
ssh -i $SSH_KEY $USER@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Stop containers
ssh -i $SSH_KEY $USER@$DROPLET_IP "cd $REMOTE_DIR && docker compose down"

# Send image
echo "📤 Uploading image..."
scp -i $SSH_KEY telegram_bot.tar $USER@$DROPLET_IP:$REMOTE_DIR/

# Send compose file and env
echo "📄 Uploading configs..."
scp -i $SSH_KEY docker-compose.yml .env $USER@$DROPLET_IP:$REMOTE_DIR/

# Load and start
echo "🚀 Loading image and starting..."
ssh -i $SSH_KEY $USER@$DROPLET_IP "cd $REMOTE_DIR && docker load < telegram_bot.tar && docker compose up -d"

echo "📋 Status check..."
ssh -i $SSH_KEY $USER@$DROPLET_IP "cd $REMOTE_DIR && sleep 3 && docker ps && docker compose logs bot"

# Cleanup
rm telegram_bot.tar

echo "✅ Deployment complete!"