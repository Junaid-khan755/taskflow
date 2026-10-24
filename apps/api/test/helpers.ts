import request from 'supertest';
import { afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

// One server per test file on a random free port (0). Supertest sends real
// HTTP requests to it, so tests exercise the full middleware stack.
const server = createApp().listen(0);
afterAll(() => new Promise((resolve) => server.close(resolve)));

export const api = request(server);

/** A workspace with one member and a board with three empty columns. */
export async function createBoard() {
  const user = await prisma.user.create({ data: { email: 'ann@example.com', name: 'Ann' } });
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
