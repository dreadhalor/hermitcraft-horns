#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 Checking VPN Public IPs${NC}"
echo "========================="
echo ""

for i in 1 2 3; do
    echo -e "${YELLOW}Gluetun-$i:${NC}"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "gluetun-local-$i"; then
        echo -e "  ${RED}❌ Container not running${NC}"
        echo ""
        continue
    fi
    
    # Get public IP through gluetun's control server
    IP_INFO=$(docker exec gluetun-local-$i wget -qO- http://localhost:8000/v1/publicip/ip 2>/dev/null || echo "unknown")
    
    if [ "$IP_INFO" = "unknown" ]; then
        echo -e "  ⚠️  Could not fetch IP (VPN may still be connecting)"
    else
        echo -e "  ${GREEN}✅ Public IP: $IP_INFO${NC}"
    fi
    
    echo ""
done

echo ""
echo -e "${BLUE}📊 Container Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(NAMES|gluetun-local|ytdl-local|redis-local)"
