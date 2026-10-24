import { Router } from 'express';
import { prisma } from '../db.js';
import { taskAccess } from '../lib/access.js';
import { parse } from '../lib/validate.js';
import { currentUserId } from '../middleware/auth.js';
import { deleteTask, moveTask, updateTask } from '../services/tasks.js';
import { idParams, taskMove, taskUpdate } from './schemas.js';

export const tasksRouter = Router();

const params = idParams('taskId');

tasksRouter.get('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  await taskAccess(currentUserId(req), taskId);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });
  res.json(task);
});

tasksRouter.patch('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  await taskAccess(currentUserId(req), taskId);
  const task = await updateTask(taskId, parse(taskUpdate, req.body));
  res.json(task);
});

// A separate endpoint for moving, because a move changes other tasks' positions
// too, while PATCH only touches this one task.
// moveTask itself checks the target column is on the same board, so access to
// the task's board covers the target column too.
tasksRouter.post('/:taskId/move', async (req, res) => {
  const { taskId } = parse(params, req.params);
  await taskAccess(currentUserId(req), taskId);
  const { columnId, position } = parse(taskMove, req.body);
  const task = await moveTask(taskId, columnId, position);
  res.json(task);
});

tasksRouter.delete('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  await taskAccess(currentUserId(req), taskId);
  await deleteTask(taskId);
  res.status(204).end();
});
