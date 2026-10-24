import { Router } from 'express';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { deleteTask, moveTask, updateTask } from '../services/tasks.js';
import { idParams, taskMove, taskUpdate } from './schemas.js';

export const tasksRouter = Router();

const params = idParams('taskId');

tasksRouter.get('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });
  res.json(task);
});

tasksRouter.patch('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  const task = await updateTask(taskId, parse(taskUpdate, req.body));
  res.json(task);
});

// A separate endpoint for moving, because a move changes other tasks' positions
// too, while PATCH only touches this one task.
tasksRouter.post('/:taskId/move', async (req, res) => {
  const { taskId } = parse(params, req.params);
  const { columnId, position } = parse(taskMove, req.body);
  const task = await moveTask(taskId, columnId, position);
  res.json(task);
});

tasksRouter.delete('/:taskId', async (req, res) => {
  const { taskId } = parse(params, req.params);
  await deleteTask(taskId);
  res.status(204).end();
});
