# TaskFlow

A team task manager (think a lightweight Trello/Linear) built with the PERN stack and TypeScript.

> 🚧 Work in progress. Built in phases, from setup through CI/CD and system design.

## Tech stack

| Layer    | Tech                                             |
| -------- | ------------------------------------------------ |
| Frontend | React, TypeScript, Vite, Tailwind CSS            |
| Backend  | Node.js, Express 5, TypeScript, Zod              |
| Database | PostgreSQL 17 (Docker)                           |
| Tooling  | npm workspaces, ESLint, Prettier, Docker Compose |

## Project structure

```
taskflow/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # React frontend
├── docker-compose.yml
└── package.json      # npm workspaces root
```

## Getting started

**Prerequisites:** Node.js 22+, Docker Desktop

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (runs on port 5433)
npm run db:up

# 3. Create the API env file
cp apps/api/.env.example apps/api/.env

# 4. Start the API and the web app
npm run dev
```

- Web app: http://localhost:5173
- API health check: http://localhost:4000/api/health

## Scripts

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `npm run dev`       | Run API and web app in dev mode |
| `npm run build`     | Build both apps                 |
| `npm run typecheck` | Type-check both apps            |
| `npm run lint`      | Lint the whole repo             |
| `npm run format`    | Format code with Prettier       |
| `npm run db:up`     | Start Postgres in Docker        |
| `npm run db:down`   | Stop Postgres                   |

## Roadmap

- [x] Phase 0: Monorepo setup, tooling, Docker Postgres, health check
- [ ] Phase 1: Database schema, boards and tasks CRUD
- [ ] Phase 2: Authentication and workspace roles
- [ ] Phase 3: Unit and API tests
- [ ] Phase 4: CI/CD with GitHub Actions
- [ ] Phase 5: Real-time updates, Redis caching, background jobs
- [ ] Phase 6: Deployment, logging, monitoring
