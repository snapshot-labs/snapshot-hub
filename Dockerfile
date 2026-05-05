FROM oven/bun:1.2.0-slim

# Update O.S. and install required packages (for native module builds)
RUN apt-get update && apt-get upgrade -y \
  && apt-get install -y git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Create the application workdir
RUN mkdir -p /home/bun/app && chown -R bun:bun /home/bun/app
RUN mkdir -p /home/bun/app/uploads && chown -R bun:bun /home/bun/app/uploads
WORKDIR /home/bun/app

# Set current user
USER bun

# Copy app dependencies
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun renovate*.json ./

# Install app dependencies
RUN bun install --frozen-lockfile

# Bundle app source
COPY --chown=bun:bun . .

# Set the container port
EXPOSE 8080

# Build the app
RUN bun run build

# Start the application
CMD ["bun", "run", "start"]
