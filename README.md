# Preconditions

It's recommended to use [bun](https://bun.sh/) to run this project.

Install bun:

`powershell -c "irm bun.sh/install.ps1 | iex"` (Windows)

`curl -fsSL https://bun.sh/install | bash` (Linux/Mac)

# Start

`bun run build-dev` to run a continuous build of the web app.

`bun run start-dev` to run a dev server that will automatically reload the web app when you make changes.

# Host

Use the [Dockerfile](Dockerfile) to build a docker image that can be deployed to a server.

# Code Quality Tools

This project uses ESLint and Prettier to maintain code quality and consistency.

## Automatic Formatting and Linting

The project is configured to automatically:

- Remove unused imports
- Format code according to the project's style guidelines
- Check for common errors and issues

These checks run automatically when you commit code, thanks to husky and lint-staged.

## Manual Commands

You can also run these tools manually:

- `bun run lint` - Check for linting issues
- `bun run lint:fix` - Fix linting issues automatically
- `bun run format` - Format all code files
- `bun run format:check` - Check if all files are properly formatted

## Configuration Files

- `.eslintrc.json` - ESLint configuration
- `.prettierrc.json` - Prettier configuration
- `.lintstagedrc.json` - lint-staged configuration
