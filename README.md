# Preconditions

It's recommended to use [bun](https://bun.sh/) to run this project.

Install bun:

`powershell -c "irm bun.sh/install.ps1 | iex"` (Windows)

`curl -fsSL https://bun.sh/install | bash` (Linux/Mac)

# Start

`bun run build-web` to run a continuous build of the web app.

`bun run start-bun` to run a dev server that will automatically reload the web app when you make changes.

# Host

Use the [Dockerfile](Dockerfile) to build a docker image that can be deployed to a server.
