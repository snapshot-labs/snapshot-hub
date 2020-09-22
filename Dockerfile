# Node version matching the version declared in the package.json 
FROM node:14.0-slim

# Update O.S.
RUN apt-get update && apt-get upgrade -y 

# Install required O.S. packages
RUN apt-get install -y git python make g++

# Create the application workdir
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Set current user
USER node

# Copy app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY --chown=node:node . .

# Set the container port 
EXPOSE 8080

# Start the aplication
CMD ["npm", "run", "start" ]