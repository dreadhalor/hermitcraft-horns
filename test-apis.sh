#!/bin/bash

# Comprehensive API testing script
# Tests both ytdl and admin APIs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Keys
YTDL_KEY="b9ed97215fc43a2da861f0feafa8b5e81eedae9e27395cca4b092c5a2fe92d6c"
ADMIN_KEY="91c935895488cab478a81b79b5084355d6930929c94dcc70187e46a87a3c745b"

# URLs
YTDL_URL="http://54.89.134.191:3001"
ADMIN_URL="https://www.hermitcraft-horns.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 API Testing Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Admin Stats API
echo -e "${YELLOW}1. Testing Admin Stats API${NC}"
ADMIN_RESPONSE=$(curl -s --max-time 5 "${ADMIN_URL}/api/admin/stats" \
  -H "X-API-Key: ${ADMIN_KEY}" || echo '{"error":"timeout"}')

if echo "$ADMIN_RESPONSE" | grep -q '"total"'; then
  echo -e "${GREEN}✅ Admin Stats API: Working${NC}"
  echo "$ADMIN_RESPONSE" | jq -c '{total, recent, topUsers: (.topUsers | length)}'
else
  echo -e "${RED}❌ Admin Stats API: Failed${NC}"
  echo "$ADMIN_RESPONSE" | jq '.' 2>/dev/null || echo "$ADMIN_RESPONSE"
fi
echo ""

# Test 2: Admin Logs API
echo -e "${YELLOW}2. Testing Admin Logs API${NC}"
LOGS_RESPONSE=$(curl -s --max-time 5 "${ADMIN_URL}/api/admin/logs?limit=5" \
  -H "X-API-Key: ${ADMIN_KEY}" || echo '{"error":"timeout"}')

if echo "$LOGS_RESPONSE" | grep -q '"logs"'; then
  LOG_COUNT=$(echo "$LOGS_RESPONSE" | jq '.count')
  echo -e "${GREEN}✅ Admin Logs API: Working (${LOG_COUNT} logs)${NC}"
  if [ "$LOG_COUNT" -gt 0 ]; then
    echo "Recent logs:"
    echo "$LOGS_RESPONSE" | jq -c '.logs[] | {taskId, status, createdAt}'
  fi
else
  echo -e "${RED}❌ Admin Logs API: Failed${NC}"
  echo "$LOGS_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGS_RESPONSE"
fi
echo ""

# Test 3: ytdl Service (enqueue)
echo -e "${YELLOW}3. Testing ytdl Service (enqueue)${NC}"
YTDL_RESPONSE=$(curl -s --max-time 10 -X POST "${YTDL_URL}/trpc/enqueueTask" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${YTDL_KEY}" \
  -d '{"videoUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","start":0,"end":5000}' \
  2>/dev/null || echo '{"error":"timeout or connection refused"}')

if echo "$YTDL_RESPONSE" | grep -q '"taskId"'; then
  TASK_ID=$(echo "$YTDL_RESPONSE" | jq -r '.result.data.json.taskId // .result.data.taskId // empty')
  echo -e "${GREEN}✅ ytdl Enqueue: Working${NC}"
  echo "Task ID: $TASK_ID"
  
  # Test 4: Check task status
  if [ -n "$TASK_ID" ]; then
    echo ""
    echo -e "${YELLOW}4. Testing ytdl Status Check${NC}"
    sleep 2
    STATUS_RESPONSE=$(curl -s --max-time 5 -G "${YTDL_URL}/trpc/checkTaskStatus" \
      -H "X-API-Key: ${YTDL_KEY}" \
      --data-urlencode "input={\"taskId\":\"${TASK_ID}\"}" \
      2>/dev/null || echo '{"error":"timeout"}')
    
    if echo "$STATUS_RESPONSE" | grep -q '"status"'; then
      STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.result.data.json.status // .result.data.status // empty')
      echo -e "${GREEN}✅ ytdl Status Check: Working${NC}"
      echo "Status: $STATUS"
    else
      echo -e "${RED}❌ ytdl Status Check: Failed${NC}"
      echo "$STATUS_RESPONSE"
    fi
  fi
else
  echo -e "${RED}❌ ytdl Enqueue: Failed or Not Running${NC}"
  echo "$YTDL_RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "- Admin APIs: Check above for ✅/❌"
echo "- ytdl Service: Check above for ✅/❌"
echo ""
echo "If ytdl is failing:"
echo "  1. SSH to EC2: Check if Docker is running"
echo "  2. Check logs: docker-compose logs ytdl"
echo "  3. Restart: cd ~ && docker-compose up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
