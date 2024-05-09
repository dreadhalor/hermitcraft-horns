ARG NODE_VERSION=21.6.1
# Use node image for base image for all stages.
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine as base
# FROM node:${NODE_VERSION}-alpine as base
ARG PNPM_VERSION=8.15.1

# Set working directory for all build stages.
WORKDIR /usr/src/app/apps/ytdl

# Install pnpm.
RUN npm install -g pnpm@${PNPM_VERSION}

# Install ffmpeg, Python, and download yt-dlp binary
RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    python3 \
    curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Copy all local files (because secrets + bigger assets aren't in the git repo)
COPY . .

# Install dependencies.
RUN pnpm i

# Nothing to build, just run the server.
# Expose the port.
EXPOSE 3001

# Start the server.
ENTRYPOINT ["pnpm", "start"]