#!/bin/bash

# Admin API test script
# Usage: ./test-admin-api.sh [production|local]

ENV="${1:-production}"
ADMIN_KEY="91c935895488cab478a81b79b5084355d6930929c94dcc70187e46a87a3c745b"

if [ "$ENV" = "local" ]; then
  BASE_URL="http://localhost:3001"
else
  BASE_URL="https://www.hermitcraft-horns.com"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Admin API ($ENV)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Testing /api/admin/stats..."
curl -s "$BASE_URL/api/admin/stats" \
  -H "X-API-Key: $ADMIN_KEY" | jq '.'

echo ""
echo "2. Testing /api/admin/logs?limit=5..."
curl -s "$BASE_URL/api/admin/logs?limit=5" \
  -H "X-API-Key: $ADMIN_KEY" | jq '.'

echo ""
echo "3. Testing auth (without key - should fail)..."
curl -s "$BASE_URL/api/admin/stats" | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
