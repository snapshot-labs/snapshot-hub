# Node version matching the version declared in the package.json
FROM node:24.14-slim

# Update O.S.
RUN apt-get update && apt-get upgrade -y

# Install required O.S. packages
RUN apt-get install -y git python3 make g++ curl unzip

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v1.2.0 --no-modify-path \
  && mv /root/.bun/bin/bun /usr/local/bin/bun \
  && rm -rf /root/.bun

# Create the application workdir
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/uploads && chown -R node:node /home/node/app/uploads
WORKDIR /home/node/app

# Set current user
USER node

# Copy app dependencies
COPY --chown=node:node package.json bun.lock ./
COPY --chown=node:node renovate*.json ./

# Install app dependencies
RUN bun install --frozen-lockfile

# Bundle app source
COPY --chown=node:node . .

# Set the container port
EXPOSE 8080

# Build the app
RUN bun run build

# Start the application
CMD ["bun", "run", "start"]
