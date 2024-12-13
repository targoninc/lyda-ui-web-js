FROM oven/bun:1 AS base

# Set the working directory
WORKDIR /usr/src/app

# Copy the current directory contents into the container at /usr/src/app
COPY . .

# Install the project dependencies
RUN bun install
RUN bun run build-prod

# Make the app's ports available to the outside world
EXPOSE 3000

# Define the command to run the app
CMD ["bun", "run", "start-bun-prod"]