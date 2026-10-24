# TaskFlow

A team task manager (think a lightweight Trello/Linear) built with the PERN stack and TypeScript.

> 🚧 Work in progress. Built in phases, from setup through CI/CD and system design.

## Tech stack

| Layer    | Tech                                             |
| -------- | ------------------------------------------------ |
| Frontend | React, TypeScript, Vite, Tailwind CSS            |
| UI data  | TanStack Query, React Router, dnd-kit            |
| Backend  | Node.js, Express 5, TypeScript, Zod              |
| Database | PostgreSQL 17 (Docker), Prisma ORM               |
| Testing  | Vitest, Supertest (against a real Postgres)      |
| Tooling  | npm workspaces, ESLint, Prettier, Docker Compose |

## Project structure

```
taskflow/
├── apps/
│   ├── api/          # Express REST API
│   │   ├── prisma/   # Schema, migrations, seed data
│   │   ├── src/
│   │   │   ├── routes/    # HTTP layer: validate input, send responses
│   │   │   ├── services/  # Business logic (ordering, transactions)
│   │   │   └── lib/       # Errors and validation helpers
│   │   └── test/     # API tests
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

# 4. Create the tables and load demo data
npm run db:migrate
npm run db:seed

# 5. Start the API and the web app
npm run dev
```

- Web app: http://localhost:5173. Log in as `alice@example.com` (owner) or
  `bob@example.com` (member) with password `password123`, or sign up.
- API health check: http://localhost:4000/api/health

## Security

- **Passwords** are hashed with scrypt (salted, memory-hard) and compared in
  constant time. Very common passwords are refused. Login gives the same
  error, in the same time, for a wrong email or a wrong password.
- **Sessions** are random tokens in an `httpOnly`, `SameSite=Lax` cookie:
  page scripts can't read it (XSS), and other sites can't send it (CSRF).
  The database stores only a SHA-256 hash of each token, and logging out
  deletes the session, so a copied cookie stops working immediately.
- **Authorization:** every request checks you're a member of the workspace
  that owns the board, column or task. Non-members get `404`, so they can't
  even confirm it exists. Admin-only actions return `403` for members.
- **Rate limiting:** 10 wrong passwords per account, 100 per network, and 10
  sign-ups per hour per network. Successful logins never count.
- **Safe redirects:** after login, `?next=` only accepts paths inside the app.

These were checked by attacking the app (SQL injection, XSS, forged and
replayed session tokens, brute force, open redirects, oversized requests),
and each fix has a test so it can't come back.

| Action                                    | Member | Admin | Owner |
| ----------------------------------------- | :----: | :---: | :---: |
| View boards, create boards                |   ✓    |   ✓   |   ✓   |
| Add, edit, move, delete tasks and columns |   ✓    |   ✓   |   ✓   |
| Rename or delete boards                   |        |   ✓   |   ✓   |
| Add or remove members                     |        |   ✓   |   ✓   |

## Data model

```
User ──< WorkspaceMember >── Workspace ──< Board ──< Column ──< Task
                (role)                                           │
User ───────────────────────── assignee (optional) ──────────────┘
```

Columns and tasks have a `position` (0, 1, 2, …) that sets their order.
Every change to the order runs in a transaction that locks the board row
(`SELECT … FOR UPDATE`), so two people dragging tasks at the same time can't
corrupt it. The test suite checks this with 20 parallel requests.

## API

All routes are under `/api`. Bodies are JSON and validated with Zod. Invalid
input returns `400` with the error for each field. Everything except `/auth`
and `/health` requires login (`401` otherwise).

| Method | Route                              | Description                           |
| ------ | ---------------------------------- | ------------------------------------- |
| POST   | `/auth/register`                   | Sign up and log in                    |
| POST   | `/auth/login`                      | Log in                                |
| POST   | `/auth/logout`                     | Log out                               |
| GET    | `/auth/me`                         | The logged-in user                    |
| GET    | `/workspaces`                      | Your workspaces, with your role       |
| POST   | `/workspaces`                      | Create a workspace (you're the owner) |
| GET    | `/workspaces/:workspaceId/members` | List members and roles                |
| POST   | `/workspaces/:workspaceId/members` | Add a member by email (admin)         |
| DELETE | `/workspaces/:id/members/:userId`  | Remove a member (admin)               |
| GET    | `/workspaces/:workspaceId/boards`  | List a workspace's boards             |
| POST   | `/workspaces/:workspaceId/boards`  | Create a board (with default columns) |
| GET    | `/boards/:boardId`                 | Full board: columns and their tasks   |
| PATCH  | `/boards/:boardId`                 | Rename or describe a board            |
| DELETE | `/boards/:boardId`                 | Delete a board and everything on it   |
| POST   | `/boards/:boardId/columns`         | Add a column (optionally at a spot)   |
| PATCH  | `/columns/:columnId`               | Rename or move a column               |
| DELETE | `/columns/:columnId`               | Delete a column and its tasks         |
| POST   | `/columns/:columnId/tasks`         | Add a task to the bottom of a column  |
| GET    | `/tasks/:taskId`                   | Get one task                          |
| PATCH  | `/tasks/:taskId`                   | Edit title, priority, due date, etc.  |
| POST   | `/tasks/:taskId/move`              | Move to `{ columnId, position }`      |
| DELETE | `/tasks/:taskId`                   | Delete a task                         |

## Scripts

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Run API and web app in dev mode |
| `npm run build`      | Build both apps                 |
| `npm run typecheck`  | Type-check both apps            |
| `npm run lint`       | Lint the whole repo             |
| `npm run format`     | Format code with Prettier       |
| `npm test`           | Run API tests (needs Postgres)  |
| `npm run db:up`      | Start Postgres in Docker        |
| `npm run db:down`    | Stop Postgres                   |
| `npm run db:migrate` | Apply schema changes            |
| `npm run db:seed`    | Reset dev data to the demo set  |

## Roadmap

- [x] Phase 0: Monorepo setup, tooling, Docker Postgres, health check
- [x] Phase 1: Database schema, boards and tasks CRUD, API tests
- [x] Phase 1.5: Kanban board UI with drag-and-drop and optimistic updates
- [x] Phase 2: Authentication and workspace roles
- [ ] Phase 3: Frontend tests and test coverage
- [ ] Phase 4: CI/CD with GitHub Actions
- [ ] Phase 5: Real-time updates, Redis caching, background jobs
- [ ] Phase 6: Deployment, logging, monitoring
