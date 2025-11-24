#!/bin/bash

set -e

echo "🚀 Building Database Backup Manager"
echo "===================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found!"
    exit 1
fi

echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install

echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build

echo -e "${BLUE}📋 Copying build files...${NC}"
cd ..
rm -rf public
cp -r frontend/dist public

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure .env file"
echo "  2. Run: docker-compose up -d"
echo "  3. Access: http://localhost:3001"
