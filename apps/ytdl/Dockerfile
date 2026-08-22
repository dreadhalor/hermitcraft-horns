# Use the specified Node.js version on Alpine Linux.
# No hardcoded platform: CI passes --platform linux/amd64 explicitly (EC2),
# while a bare local build produces a native image (arm64 on Apple Silicon).
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine as base
ARG PNPM_VERSION=8.15.1

# Set the working directory
WORKDIR /usr/src/app/apps/ytdl

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Install ffmpeg, Python, and yt-dlp (no OpenVPN needed).
# yt-dlp is PINNED rather than "latest" on purpose: Docker caches this layer, so
# "latest" resolves once and then silently freezes at whatever shipped the day the
# layer was first built. That is how this image sat on 2026.07.04 for six weeks
# (2026-08-22 investigation) while believing itself to be tracking latest.
# Bump this ARG to upgrade -- changing it busts the cache by itself. Workers also
# self-update at runtime weekly, so the fleet heals without a rebuild.
#
# Staying current matters more than usual here, because which YouTube clients work
# changes underneath us -- see the next stanza and worker.ts's CLIENT_LADDER.
ARG YTDLP_VERSION=2026.08.19
RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    python3 \
    curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --version

# Two things yt-dlp needs to have MORE THAN ONE way into YouTube. Without them it
# falls back to whichever single client still works, and the day YouTube blocks
# that one the service is simply down -- which is exactly what happened 8/19-8/20.
#
#  * deno  -- a JS runtime yt-dlp actually accepts. It reports node 20 as
#             "unsupported", so without deno it cannot solve YouTube's JS
#             challenges at all.
#  * bgutil PO token plugin -- without a PO token provider YouTube answers the
#             entire web client family with "Only images are available", which is
#             what collapsed the client pool down to one. Pairs with the
#             `pot-provider` service in docker-compose; keep these versions in sync.
ARG POT_PLUGIN_VERSION=1.3.2
RUN apk add --no-cache deno && \
    mkdir -p /root/.config/yt-dlp/plugins && \
    curl -L https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${POT_PLUGIN_VERSION}/bgutil-ytdlp-pot-provider.zip \
      -o /root/.config/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip && \
    deno --version | head -1

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml* ./

# Install project dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application files
COPY . .

# Expose the application port
EXPOSE 3001

# Start the Node.js application directly
CMD ["pnpm", "start"]
