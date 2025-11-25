#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Database Backup Manager - Deployment Script${NC}"
echo "================================================"
# Get latest commit SHA
LATEST_SHA=$(curl -s https://api.github.com/repos/firepeak-technology/database-backup-manager/commits/main | grep '"sha"' | head -1 | cut -d'"' -f4)

# Download using commit SHA (never cached)
curl -O "https://raw.githubusercontent.com/firepeak-technology/database-backup-manager/${LATEST_SHA}/deploy.sh"
curl -O "https://raw.githubusercontent.com/firepeak-technology/database-backup-manager/${LATEST_SHA}/docker-compose.yml"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found!${NC}"
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed${NC}"
    echo -e "${YELLOW}⚠️  Please log out and back in for group changes${NC}"
    exit 0
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    if [ -f ".env.template" ]; then
        cp .env.template .env
        echo -e "${GREEN}✅ Created .env file${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env before continuing${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p configs backups logs

echo "📥 Pulling latest images..."
docker compose pull

echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker compose build

if docker ps -a --format '{{.Names}}' | grep -q "backup-manager"; then
    echo -e "${BLUE}🛑 Stopping existing container...${NC}"
    docker compose down
fi

echo -e "${BLUE}🚀 Starting containers...${NC}"
docker compose up -d

sleep 5

if docker ps --format '{{.Names}}' | grep -q "backup-manager"; then
    PORT=$(docker compose port backup-manager 3001 2>/dev/null | cut -d: -f2 || echo "3001")
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "🌐 Access: http://localhost:${PORT}"
    echo "📊 Logs: docker compose logs -f"
else
    echo -e "${RED}❌ Container failed to start${NC}"
    exit 1
fi
