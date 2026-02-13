#!/bin/bash

# Test script for ytdl service with authentication
# Usage: ./test-ytdl.sh [local|prod]

set -e

# Configuration
ENV=${1:-local}
if [ "$ENV" = "prod" ]; then
  YTDL_URL="https://ytdl.hermitcrafthorns.com"
  echo "🌐 Testing production ytdl service..."
else
  YTDL_URL="http://localhost:3001"
  echo "💻 Testing local ytdl service..."
fi

# Load API key from .env if not set
if [ -z "$YTDL_INTERNAL_API_KEY" ]; then
  if [ -f ".env" ]; then
    export $(grep YTDL_INTERNAL_API_KEY .env | xargs)
  fi
fi

if [ -z "$YTDL_INTERNAL_API_KEY" ]; then
  echo "❌ Error: YTDL_INTERNAL_API_KEY not set"
  echo "   Set it with: export YTDL_INTERNAL_API_KEY=your_api_key"
  echo "   Or add it to .env file"
  exit 1
fi

# Test video (short Hermitcraft clip)
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
START=0
END=5000

echo "📹 Video: $VIDEO_URL"
echo "⏱️  Clip: ${START}ms to ${END}ms"
echo ""

# Step 1: Enqueue task
echo "1️⃣  Enqueuing task..."
RESPONSE=$(curl -s -X POST "${YTDL_URL}/trpc/enqueueTask" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${YTDL_INTERNAL_API_KEY}" \
  -d "{\"videoUrl\":\"${VIDEO_URL}\",\"start\":${START},\"end\":${END}}")

echo "Response: $RESPONSE"

# Extract taskId from response
TASK_ID=$(echo $RESPONSE | grep -o '"taskId":"[^"]*' | grep -o '[^"]*$' | tail -1)

if [ -z "$TASK_ID" ]; then
  echo "❌ Failed to get task ID"
  exit 1
fi

echo "✅ Task enqueued with ID: $TASK_ID"
echo ""

# Step 2: Poll for completion
echo "2️⃣  Waiting for task to complete..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
  
  STATUS_RESPONSE=$(curl -s -G "${YTDL_URL}/trpc/checkTaskStatus" \
    -H "X-API-Key: ${YTDL_INTERNAL_API_KEY}" \
    --data-urlencode "input={\"taskId\":\"${TASK_ID}\"}")
  
  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | tail -1)
  
  echo "   Attempt $ATTEMPT: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Task completed successfully!"
    echo ""
    echo "Full response:"
    echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Task failed"
    echo "$STATUS_RESPONSE"
    exit 1
  fi
done

echo "⏱️  Timeout after $MAX_ATTEMPTS attempts"
exit 1
