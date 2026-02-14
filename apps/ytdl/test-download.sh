#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load API key from .env
source .env

echo -e "${BLUE}🎵 Testing Multi-VPN Download${NC}"
echo "=============================="
echo ""

# Test video (Rick Astley - works reliably)
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
START_MS=0
END_MS=10000

echo -e "${YELLOW}📹 Video: Rick Astley - Never Gonna Give You Up${NC}"
echo -e "${YELLOW}⏱️  Duration: 0s - 10s${NC}"
echo ""

# Make the request
echo -e "${BLUE}🚀 Enqueuing download task...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3001/trpc/enqueueTask \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${YTDL_INTERNAL_API_KEY}" \
  -d '{
    "videoUrl": "'"${VIDEO_URL}"'",
    "start": '"${START_MS}"',
    "end": '"${END_MS}"',
    "source": "cli"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.'

# Extract task ID
TASK_ID=$(echo "$RESPONSE" | jq -r '.result.data.taskId')

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
    echo -e "${RED}❌ Failed to get task ID${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Task ID: ${TASK_ID}${NC}"
echo ""
echo -e "${YELLOW}⏳ Polling for completion...${NC}"
echo ""

# Poll for completion
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    STATUS_RESPONSE=$(curl -s -X POST http://localhost:3001/trpc/checkTaskStatus \
      -H "Content-Type: application/json" \
      -H "x-api-key: ${YTDL_INTERNAL_API_KEY}" \
      -d '{"taskId": "'"${TASK_ID}"'"}')
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.result.data.status')
    PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.result.data.progress')
    
    echo -ne "\r${BLUE}Status: ${STATUS} | Progress: ${PROGRESS}%${NC}     "
    
    if [ "$STATUS" = "completed" ]; then
        echo ""
        echo ""
        echo -e "${GREEN}✅ Download completed successfully!${NC}"
        echo ""
        echo -e "${YELLOW}📊 Full response:${NC}"
        echo "$STATUS_RESPONSE" | jq '.'
        
        # Show ytdl logs to see VPN attempts
        echo ""
        echo -e "${BLUE}🌐 VPN Journey (last 50 lines of logs):${NC}"
        docker logs ytdl-local 2>&1 | tail -50
        break
    elif [ "$STATUS" = "failed" ]; then
        echo ""
        echo ""
        echo -e "${RED}❌ Download failed${NC}"
        echo ""
        echo "$STATUS_RESPONSE" | jq '.'
        
        echo ""
        echo -e "${YELLOW}📋 ytdl logs:${NC}"
        docker logs ytdl-local 2>&1 | tail -100
        exit 1
    fi
    
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo -e "${RED}❌ Timeout waiting for completion${NC}"
    exit 1
fi
