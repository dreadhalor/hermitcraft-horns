ARG NODE_VERSION=21.6.1

# Use node image for base image for all stages.
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine as base
# FROM node:${NODE_VERSION}-alpine as base

ARG PNPM_VERSION=8.15.1

# Set working directory for all build stages.
WORKDIR /usr/src/app/apps/ytdl

# Install pnpm.
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy all local files (because secrets + bigger assets aren't in the git repo)
COPY . .

# Install dependencies.
RUN pnpm i

# Nothing to build, just run the server.

# Expose the port.
EXPOSE 3000

# Start the server.
ENTRYPOINT ["pnpm", "start"]