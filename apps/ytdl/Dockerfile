# Use the specified Node.js version on Alpine Linux
ARG NODE_VERSION=20
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine as base
ARG PNPM_VERSION=8.15.1

# Set the working directory
WORKDIR /usr/src/app/apps/ytdl

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Install ffmpeg, Python, and yt-dlp (no OpenVPN needed)
RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    python3 \
    curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

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
