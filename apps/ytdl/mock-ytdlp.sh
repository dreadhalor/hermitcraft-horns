#!/bin/sh
# Mock yt-dlp wrapper for testing VPN failover
#
# How it works:
#   - Checks /tmp/fail-proxies.txt for a list of proxy URLs that should "fail"
#   - If the current HTTP_PROXY matches a line in that file, simulates a YouTube rejection
#   - Otherwise, passes through to the real yt-dlp
#
# Usage:
#   To make gluetun-1 fail:  echo "http://gluetun-1:8888" >> /tmp/fail-proxies.txt
#   To make gluetun-2 fail:  echo "http://gluetun-2:8888" >> /tmp/fail-proxies.txt
#   To clear all failures:   rm /tmp/fail-proxies.txt
#   To see current failures: cat /tmp/fail-proxies.txt

REAL_YTDLP="/usr/local/bin/yt-dlp.real"
FAIL_FILE="/tmp/fail-proxies.txt"
PROXY="${HTTP_PROXY:-none}"

# Check if this proxy should fail
if [ -f "$FAIL_FILE" ] && grep -qF "$PROXY" "$FAIL_FILE" 2>/dev/null; then
    echo "WARNING: [youtube] Sign in to confirm you're not a bot. This helps protect our community." >&2
    echo "ERROR: [youtube] dQw4w9WgXcQ: Sign in to confirm you're not a bot." >&2
    # Sleep briefly to simulate network time (realistic timing)
    sleep 1
    exit 1
fi

# Pass through to real yt-dlp
exec "$REAL_YTDLP" "$@"
