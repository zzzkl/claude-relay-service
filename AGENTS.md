# Repository Guidelines

This repository hosts the Claude Relay Service — a Node.js (Express) API relay with multi‑provider support and an admin SPA. Use this guide to develop, test, and contribute safely and consistently.

## Project Structure & Module Organization
- `src/app.js`: Express entry; mounts `routes/`, configures middleware and logging.
- `src/`: `routes/`, `services/`, `middleware/`, `models/redis.js`, `utils/`.
- `cli/`: Interactive admin/keys/accounts management.
- `scripts/`: Maintenance, data transfer, migrations, service control.
- `config/`: `config.example.js` → copy to `config.js`.
- `web/admin-spa/`: Admin dashboard SPA.
- `docs/`, `logs/`, `data/`: Documentation, runtime logs, data mounts.

## Build, Test, and Development Commands
- Install: `make install` and `make install-web` (or `npm run install:web`).
- Setup (env + admin): `make setup`.
- Dev server (nodemon): `make dev`.
- Start (prod): `make start` or `npm start`.
- Lint/format: `npm run lint`, `npm run format`, `npm run lint:check`.
- Tests: `npm test`, coverage `npm test -- --coverage` (or `make test-coverage`).
- Docker: `npm run docker:build`, `npm run docker:up`, `npm run docker:down`.
- Service mgmt: `npm run service:status`, `service:start`, `service:logs:follow`.

## Coding Style & Naming Conventions
- Node >= 18. ESLint + Prettier enforced.
- Prettier: 2 spaces, single quotes, no semicolons, width 100.
- Prefer camelCase for files in `src/` (e.g., `claudeRelayService.js`), kebab-case for `scripts/`.
- Constants in `UPPER_SNAKE_CASE`; classes in `PascalCase`.
- Use `eqeqeq`, `curly`, `prefer-const`, `no-var`; template strings over concatenation.

## Testing Guidelines
- Framework: Jest; HTTP testing via `supertest`.
- File names: `*.test.js` or `*.spec.js`; place beside modules or under `tests/`.
- Run locally with `npm test`; aim to cover new routes/services and edge cases.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Example: `feat: 支持 Azure OpenAI 账户管理`.
- PRs must include: clear description, linked issues (`#123`), local test steps, screenshots for `web/admin-spa` UI, and updates to `.env.example`/`README` for config changes.
- Ensure `npm run lint` and `npm test` pass; avoid committing logs or secrets.

## Security & Configuration Tips
- Generate config via `make setup`; never commit `.env` or secrets.
- Set `JWT_SECRET` and `ENCRYPTION_KEY`; verify `REDIS_*` variables.
- Behind proxies set `TRUST_PROXY=true`; use `WEBHOOK_*` with care.
- For data handling, prefer `npm run data:export:sanitized` or encrypted export.

