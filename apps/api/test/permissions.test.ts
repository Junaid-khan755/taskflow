import { describe, expect, it } from 'vitest';
import { addTasks, api, createBoard, newAgent, signUp } from './helpers.js';

// Ann owns a workspace. Eve has an account but isn't a member.
// Bob gets added as a regular member.

describe('workspace isolation', () => {
  it("hides other workspaces' data from non-members (404, not 403)", async () => {
    const { workspace, board, todo } = await createBoard();
    const [task] = await addTasks(todo.id, ['Secret plan']);
    const eve = newAgent();
    await signUp('Eve', eve);

    expect((await eve.get('/api/workspaces').expect(200)).body).toEqual([]);
    await eve.get(`/api/workspaces/${workspace.id}/boards`).expect(404);
    await eve.get(`/api/workspaces/${workspace.id}/members`).expect(404);
    await eve.get(`/api/boards/${board.id}`).expect(404);
    await eve.get(`/api/tasks/${task.id}`).expect(404);
    await eve.patch(`/api/tasks/${task.id}`).send({ title: 'Hacked' }).expect(404);
    await eve.delete(`/api/tasks/${task.id}`).expect(404);
    await eve.post(`/api/columns/${todo.id}/tasks`).send({ title: 'Spam' }).expect(404);
    await eve.delete(`/api/columns/${todo.id}`).expect(404);
    await eve.post(`/api/workspaces/${workspace.id}/boards`).send({ name: 'X' }).expect(404);

    // Nothing changed
    const res = await api.get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body.title).toBe('Secret plan');
  });

  it("can't move a task into another workspace's board", async () => {
    const { todo } = await createBoard();
    const eve = newAgent();
    await signUp('Eve', eve);
    const evesWorkspace = await eve
      .post('/api/workspaces')
      .send({ name: 'Eve', slug: 'eve' })
      .expect(201);
    const evesBoard = await eve
      .post(`/api/workspaces/${evesWorkspace.body.id}/boards`)
      .send({ name: 'Mine' })
      .expect(201);
    const [task] = await addTasks(todo.id, ['A']);

    // Ann owns the task but not the target column
    await api
      .post(`/api/tasks/${task.id}/move`)
      .send({ columnId: evesBoard.body.columns[0].id, position: 0 })
      .expect(400);
  });
});

describe('roles', () => {
  async function withMember() {
    const setup = await createBoard();
    const bob = newAgent();
    await signUp('Bob', bob);
    await api
      .post(`/api/workspaces/${setup.workspace.id}/members`)
      .send({ email: 'bob@example.com' })
      .expect(201);
    return { ...setup, bob };
  }

  it('lets members work on tasks and see their role', async () => {
    const { board, todo, bob } = await withMember();
    await bob.post(`/api/columns/${todo.id}/tasks`).send({ title: 'From Bob' }).expect(201);
    const res = await bob.get(`/api/boards/${board.id}`).expect(200);
    expect(res.body.role).toBe('MEMBER');
  });

  it('only lets admins and owners rename or delete boards', async () => {
    const { board, bob } = await withMember();
    await bob.patch(`/api/boards/${board.id}`).send({ name: 'Mine now' }).expect(403);
    await bob.delete(`/api/boards/${board.id}`).expect(403);
    await api.patch(`/api/boards/${board.id}`).send({ name: 'Renamed' }).expect(200);
  });

  it('only lets admins manage members', async () => {
    const { workspace, bob, user: ann } = await withMember();
    await signUp('Cat', newAgent());
    await bob
      .post(`/api/workspaces/${workspace.id}/members`)
      .send({ email: 'cat@example.com' })
      .expect(403);
    await bob.delete(`/api/workspaces/${workspace.id}/members/${ann.id}`).expect(403);
  });

  it('refuses to add unknown emails or the same person twice, and protects the owner', async () => {
    const { workspace, user: ann } = await withMember();
    await api
      .post(`/api/workspaces/${workspace.id}/members`)
      .send({ email: 'nobody@example.com' })
      .expect(404);
    await api
      .post(`/api/workspaces/${workspace.id}/members`)
      .send({ email: 'bob@example.com' })
      .expect(409);
    await api.delete(`/api/workspaces/${workspace.id}/members/${ann.id}`).expect(400);
  });

  it('removes a member and unassigns their tasks', async () => {
    const { workspace, todo, bob } = await withMember();
    const me = await bob.get('/api/auth/me').expect(200);
    const task = await api
      .post(`/api/columns/${todo.id}/tasks`)
      .send({ title: 'For Bob', assigneeId: me.body.id })
      .expect(201);

    await api.delete(`/api/workspaces/${workspace.id}/members/${me.body.id}`).expect(204);

    await bob.get(`/api/tasks/${task.body.id}`).expect(404);
    const after = await api.get(`/api/tasks/${task.body.id}`).expect(200);
    expect(after.body.assigneeId).toBeNull();
  });
});
