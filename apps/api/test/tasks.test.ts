import { describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { addTasks, api, createBoard, positionsIn, titlesIn } from './helpers.js';

describe('tasks', () => {
  it('adds new tasks to the bottom of the column', async () => {
    const { todo } = await createBoard();
    await addTasks(todo.id, ['A', 'B', 'C']);
    expect(await titlesIn(todo.id)).toEqual(['A', 'B', 'C']);
    expect(await positionsIn(todo.id)).toEqual([0, 1, 2]);
  });

  it('only assigns workspace members', async () => {
    const { todo, user } = await createBoard();
    const outsider = await prisma.user.create({ data: { email: 'x@example.com', name: 'X' } });

    await api
      .post(`/api/columns/${todo.id}/tasks`)
      .send({ title: 'T', assigneeId: outsider.id })
      .expect(400);
    const res = await api
      .post(`/api/columns/${todo.id}/tasks`)
      .send({ title: 'T', assigneeId: user.id, priority: 'HIGH', dueDate: '2026-12-01T09:00:00Z' })
      .expect(201);
    expect(res.body).toMatchObject({ assigneeId: user.id, priority: 'HIGH' });
  });

  it('updates fields without changing position', async () => {
    const { todo } = await createBoard();
    const [, b] = await addTasks(todo.id, ['A', 'B']);
    const res = await api.patch(`/api/tasks/${b.id}`).send({ title: 'B2' }).expect(200);
    expect(res.body).toMatchObject({ title: 'B2', position: 1 });
  });

  it('moves a task down and up within a column', async () => {
    const { todo } = await createBoard();
    const [a, , , d] = await addTasks(todo.id, ['A', 'B', 'C', 'D']);

    await api.post(`/api/tasks/${a.id}/move`).send({ columnId: todo.id, position: 2 }).expect(200);
    expect(await titlesIn(todo.id)).toEqual(['B', 'C', 'A', 'D']);

    await api.post(`/api/tasks/${d.id}/move`).send({ columnId: todo.id, position: 0 }).expect(200);
    expect(await titlesIn(todo.id)).toEqual(['D', 'B', 'C', 'A']);
    expect(await positionsIn(todo.id)).toEqual([0, 1, 2, 3]);
  });

  it('moves a task to another column', async () => {
    const { todo, doing } = await createBoard();
    const [, b] = await addTasks(todo.id, ['A', 'B', 'C']);
    await addTasks(doing.id, ['X', 'Y']);

    await api.post(`/api/tasks/${b.id}/move`).send({ columnId: doing.id, position: 1 }).expect(200);
    expect(await titlesIn(todo.id)).toEqual(['A', 'C']);
    expect(await titlesIn(doing.id)).toEqual(['X', 'B', 'Y']);
    expect(await positionsIn(todo.id)).toEqual([0, 1]);
    expect(await positionsIn(doing.id)).toEqual([0, 1, 2]);
  });

  it('clamps an out-of-range position to the end', async () => {
    const { todo, doing } = await createBoard();
    const [a] = await addTasks(todo.id, ['A']);
    await addTasks(doing.id, ['X']);

    const res = await api
      .post(`/api/tasks/${a.id}/move`)
      .send({ columnId: doing.id, position: 99 });
    expect(res.body.position).toBe(1);
  });

  it('refuses to move a task to a column on another board', async () => {
    const { todo, workspace } = await createBoard();
    const [a] = await addTasks(todo.id, ['A']);
    const other = await api
      .post(`/api/workspaces/${workspace.id}/boards`)
      .send({ name: 'Other' })
      .expect(201);

    await api
      .post(`/api/tasks/${a.id}/move`)
      .send({ columnId: other.body.columns[0].id, position: 0 })
      .expect(400);
  });

  it('closes the gap when a task is deleted', async () => {
    const { todo } = await createBoard();
    const [, b] = await addTasks(todo.id, ['A', 'B', 'C']);
    await api.delete(`/api/tasks/${b.id}`).expect(204);
    await api.get(`/api/tasks/${b.id}`).expect(404);
    expect(await titlesIn(todo.id)).toEqual(['A', 'C']);
    expect(await positionsIn(todo.id)).toEqual([0, 1]);
  });
});

// Without the board lock these fail: parallel requests read the same count
// and save duplicate positions.
describe('concurrent changes', () => {
  it('gives every task a unique position when created at the same time', async () => {
    const { todo } = await createBoard();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        api
          .post(`/api/columns/${todo.id}/tasks`)
          .send({ title: `T${i}` })
          .expect(201),
      ),
    );
    expect(await positionsIn(todo.id)).toEqual([...Array(20).keys()]);
  });

  it('keeps positions gap-free when tasks are moved at the same time', async () => {
    const { todo, doing } = await createBoard();
    const tasks = await addTasks(todo.id, ['A', 'B', 'C', 'D', 'E', 'F']);

    await Promise.all(
      tasks.map((task, i) =>
        api
          .post(`/api/tasks/${task.id}/move`)
          .send({ columnId: i % 2 ? doing.id : todo.id, position: 0 })
          .expect(200),
      ),
    );
    expect(await positionsIn(todo.id)).toEqual([0, 1, 2]);
    expect(await positionsIn(doing.id)).toEqual([0, 1, 2]);
  });
});
