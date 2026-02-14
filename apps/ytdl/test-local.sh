#!/bin/bash
set -e

echo "🧪 Local Multi-VPN Testing Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with:"
    echo "  NORDVPN_USERNAME=your_username"
    echo "  NORDVPN_PASSWORD=your_password"
    echo "  YTDL_INTERNAL_API_KEY=your_api_key"
    echo "  DATABASE_URL=your_database_url"
    exit 1
fi

echo -e "${YELLOW}📦 Building ytdl Docker image...${NC}"
docker build -t ytdl-local:test .

echo ""
echo -e "${YELLOW}🚀 Starting multi-VPN stack...${NC}"
docker compose -f docker-compose.local.yml up -d

echo ""
echo -e "${YELLOW}⏳ Waiting for gluetun containers to connect to VPN...${NC}"
echo "This may take 30-60 seconds..."
sleep 10

# Check gluetun status
echo ""
echo -e "${GREEN}📊 Checking VPN connections:${NC}"
for i in 1 2 3; do
    echo ""
    echo "Gluetun-$i status:"
    docker logs gluetun-local-$i 2>&1 | tail -5 || echo "  ⚠️  Container not running"
done

echo ""
echo -e "${GREEN}✅ Stack is running!${NC}"
echo ""
echo "Services:"
echo "  - ytdl server: http://localhost:3001"
echo "  - Redis: localhost:6379"
echo "  - Gluetun-1: New York (proxy at gluetun-1:8888)"
echo "  - Gluetun-2: Los Angeles (proxy at gluetun-2:8888)"
echo "  - Gluetun-3: Miami (proxy at gluetun-3:8888)"
echo ""
echo "View logs:"
echo "  docker compose -f docker-compose.local.yml logs -f ytdl"
echo ""
echo "Test download:"
echo "  ./test-download.sh"
echo ""
echo "Stop stack:"
echo "  docker compose -f docker-compose.local.yml down"
