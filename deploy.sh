#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

if [ -z "$DROPLET_IP" ]; then
    echo "Error: DROPLET_IP not set in .env"
    exit 1
fi

SSH_KEY="$HOME/.ssh/id_rsa"
REMOTE_DIR="/root/telegram_bot"
USER="root"

echo "🚀 Deploying to $DROPLET_IP..."

# Create remote directory if not exists
ssh -i $SSH_KEY $USER@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Sync files
rsync -avz --progress \
    -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'logs' \
    ./ $USER@$DROPLET_IP:$REMOTE_DIR/

# Deploy
ssh -i $SSH_KEY $USER@$DROPLET_IP "cd $REMOTE_DIR && docker compose down && docker compose up -d --build"

echo "✅ Deployment complete!" 