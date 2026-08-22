#!/bin/sh
# Probe which YouTube player clients can still fetch audio, so CLIENT_LADDER in
# worker.ts is grounded in a fresh measurement instead of folklore.
#
# YouTube rotates which clients it serves and which it blocks. On 2026-08-22 only
# visionos / mweb / tv_embedded / web_embedded / android_vr_no_auth worked, while
# web, web_safari, ios, android and tv returned "Only images" or no audio format.
# That set WILL drift. Run this before editing the ladder.
#
# Usage:  ./scripts/probe-clients.sh [videoId]
# Runs inside the worker container so it tests the real image, real plugins and
# real egress -- probing from the host would prove nothing about production.

set -u
VIDEO_ID="${1:-K9WBHFiXN60}"
URL="https://www.youtube.com/watch?v=$VIDEO_ID"
CONTAINER="${CONTAINER:-worker-1}"
POT="${POT_PROVIDER_URL:-http://pot-provider:4416}"

CLIENTS="DEFAULT mweb tv_embedded web_embedded visionos android_vr_no_auth web web_safari ios android tv tv_simply"

echo "probing $URL in container '$CONTAINER'"
echo "yt-dlp $(docker exec "$CONTAINER" yt-dlp --version 2>/dev/null | tail -1)"
echo

for cl in $CLIENTS; do
  if [ "$cl" = "DEFAULT" ]; then EX=""; else EX="--extractor-args youtube:player_client=$cl"; fi
  out="/tmp/probe_$cl.mp3"
  docker exec "$CONTAINER" rm -f "$out" 2>/dev/null
  err=$(docker exec "$CONTAINER" sh -c "timeout 100 yt-dlp --no-cache-dir \
      --extractor-args youtubepot-bgutilhttp:base_url=$POT $EX \
      --download-sections '*00:00:30-00:00:31' --force-keyframes-at-cuts \
      -f bestaudio -x --audio-format mp3 -o '$out' '$URL' 2>&1")
  if docker exec "$CONTAINER" test -s "$out" 2>/dev/null; then
    printf '  %-22s OK\n' "$cl"
  else
    reason=$(echo "$err" | grep -oE '403 Forbidden|Sign in to confirm|Only images|Requested format|needs to be reloaded|timed out' | head -1)
    printf '  %-22s FAIL  %s\n' "$cl" "${reason:-see logs}"
  fi
  docker exec "$CONTAINER" rm -f "$out" 2>/dev/null
done

echo
echo "Put every OK client in CLIENT_LADDER (worker.ts), fastest/most reliable first."
