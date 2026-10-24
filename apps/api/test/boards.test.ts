import { describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { api, createBoard } from './helpers.js';

describe('workspaces', () => {
  it('creates a workspace', async () => {
    const res = await api.post('/api/workspaces').send({ name: 'Acme', slug: 'acme' }).expect(201);
    expect(res.body).toMatchObject({ name: 'Acme', slug: 'acme' });
  });

  it('rejects a duplicate slug with 409', async () => {
    await api.post('/api/workspaces').send({ name: 'A', slug: 'acme' }).expect(201);
    await api.post('/api/workspaces').send({ name: 'B', slug: 'acme' }).expect(409);
  });

  it('explains which fields are invalid', async () => {
    const res = await api.post('/api/workspaces').send({ name: '', slug: 'Not Valid' }).expect(400);
    expect(res.body.details).toHaveProperty('name');
    expect(res.body.details).toHaveProperty('slug');
  });

  it('returns 404 when listing boards of a missing workspace', async () => {
    await api.get(`/api/workspaces/${crypto.randomUUID()}/boards`).expect(404);
  });
});

describe('boards', () => {
  it('creates a board with default columns in order', async () => {
    const { workspace } = await createBoard();
    const res = await api
      .post(`/api/workspaces/${workspace.id}/boards`)
      .send({ name: 'Roadmap' })
      .expect(201);
    expect(res.body.columns.map((c: { name: string }) => c.name)).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
  });

  it('returns the full board with ordered columns and tasks', async () => {
    const { board, todo } = await createBoard();
    await api.post(`/api/columns/${todo.id}/tasks`).send({ title: 'First' });
    await api.post(`/api/columns/${todo.id}/tasks`).send({ title: 'Second' });

    const res = await api.get(`/api/boards/${board.id}`).expect(200);
    expect(res.body.columns).toHaveLength(3);
    expect(res.body.columns[0].tasks.map((t: { title: string }) => t.title)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api.get('/api/boards/not-a-uuid').expect(400);
    await api.get(`/api/boards/${crypto.randomUUID()}`).expect(404);
  });

  it('rejects an empty update', async () => {
    const { board } = await createBoard();
    await api.patch(`/api/boards/${board.id}`).send({}).expect(400);
  });

  it('deletes a board and everything on it', async () => {
    const { board, todo } = await createBoard();
    await api.post(`/api/columns/${todo.id}/tasks`).send({ title: 'Task' });

    await api.delete(`/api/boards/${board.id}`).expect(204);
    await api.get(`/api/boards/${board.id}`).expect(404);
    expect(await prisma.task.count()).toBe(0);
  });
});

describe('columns', () => {
  const columnNames = async (boardId: string) =>
    (await prisma.column.findMany({ where: { boardId }, orderBy: { position: 'asc' } })).map(
      (c) => c.name,
    );

  it('inserts a column at a position and shifts the rest', async () => {
    const { board } = await createBoard();
    await api
      .post(`/api/boards/${board.id}/columns`)
      .send({ name: 'Review', position: 2 })
      .expect(201);
    expect(await columnNames(board.id)).toEqual(['To Do', 'Doing', 'Review', 'Done']);
  });

  it('moves a column', async () => {
    const { board, done } = await createBoard();
    await api.patch(`/api/columns/${done.id}`).send({ position: 0 }).expect(200);
    expect(await columnNames(board.id)).toEqual(['Done', 'To Do', 'Doing']);
  });

  it('closes the gap when a column is deleted', async () => {
    const { board, todo } = await createBoard();
    await api.delete(`/api/columns/${todo.id}`).expect(204);
    const columns = await prisma.column.findMany({
      where: { boardId: board.id },
      orderBy: { position: 'asc' },
    });
    expect(columns.map((c) => [c.name, c.position])).toEqual([
      ['Doing', 0],
      ['Done', 1],
    ]);
  });
});
