# Use the official Node.js 20 image from the Docker Hub
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy the current directory contents into the container at /usr/src/app
COPY . .

# Install the project dependencies
RUN npm install

# Make the app's ports available to the outside world
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "run", "start"]
