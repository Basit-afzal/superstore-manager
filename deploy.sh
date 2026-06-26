#!/bin/bash

# Production deployment script for SuperStore
# This script deploys the application to a VPS using Docker

set -e

echo "🚀 Starting SuperStore deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please create it from .env.example"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Build and start Docker containers
echo "🐳 Building and starting Docker containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Run database migrations if needed (add your migration command here)
# echo "🗄️ Running database migrations..."
# docker-compose exec server npm run migrate

echo "✅ Deployment completed successfully!"
echo "🌐 Application is now running at http://your-domain.com"
