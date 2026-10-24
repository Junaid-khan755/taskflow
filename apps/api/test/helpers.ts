import request from 'supertest';
import { afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

// One server per test file on a random free port (0). Supertest sends real
// HTTP requests to it, so tests exercise the full middleware stack.
const server = createApp().listen(0);
afterAll(() => new Promise((resolve) => server.close(resolve)));

// An agent keeps cookies between requests, like a browser does, so after
// signing up it stays logged in. Each test gets a fresh one (logged out).
export let api = request.agent(server);
beforeEach(() => {
  api = request.agent(server);
});

export const newAgent = () => request.agent(server);

export const PASSWORD = 'correct-horse-battery';

type PublicUser = { id: string; name: string; email: string };

/** Registers a user through the API, which also logs `agent` in. */
export async function signUp(name: string, agent = api) {
  const res = await agent
    .post('/api/auth/register')
    .send({ name, email: `${name.toLowerCase()}@example.com`, password: PASSWORD })
    .expect(201);
  return res.body as PublicUser;
}

/**
 * Logs `api` in as Ann, who owns a workspace with a board of three empty
 * columns.
 */
export async function createBoard() {
  const user = await signUp('Ann');
  const workspace = await prisma.workspace.create({
    data: { name: 'Test', slug: 'test', members: { create: { userId: user.id, role: 'OWNER' } } },
  });
  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      name: 'Board',
      columns: { create: ['To Do', 'Doing', 'Done'].map((name, position) => ({ name, position })) },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  const [todo, doing, done] = board.columns;
  return { user, workspace, board, todo, doing, done };
}

/** Creates tasks through the API, in order. */
export async function addTasks(columnId: string, titles: string[]) {
  const tasks = [];
  for (const title of titles) {
    const res = await api.post(`/api/columns/${columnId}/tasks`).send({ title }).expect(201);
    tasks.push(res.body as { id: string; title: string });
  }
  return tasks;
}

/** Task titles in a column, in position order. */
export async function titlesIn(columnId: string) {
  const tasks = await prisma.task.findMany({ where: { columnId }, orderBy: { position: 'asc' } });
  return tasks.map((t) => t.title);
}

/** Positions in a column. Should always be exactly 0, 1, 2, ... with no gaps. */
export async function positionsIn(columnId: string) {
  const tasks = await prisma.task.findMany({ where: { columnId }, orderBy: { position: 'asc' } });
  return tasks.map((t) => t.position);
}
