FROM node:18.12-alpine

# Create Directory for the Container
WORKDIR /usr/src/app

# Install App Dependencies
COPY package*.json ./
RUN npm install

# Copy App Source
COPY . .

#Expose the container port
EXPOSE 10000

# Start
CMD [ "npx", "tsx", "demos/demo-server.ts" ]
