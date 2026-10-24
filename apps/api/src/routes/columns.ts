import { Router } from 'express';
import { columnAccess } from '../lib/access.js';
import { parse } from '../lib/validate.js';
import { currentUserId } from '../middleware/auth.js';
import { deleteColumn, updateColumn } from '../services/columns.js';
import { createTask } from '../services/tasks.js';
import { columnUpdate, idParams, taskCreate } from './schemas.js';

export const columnsRouter = Router();

const params = idParams('columnId');

columnsRouter.patch('/:columnId', async (req, res) => {
  const { columnId } = parse(params, req.params);
  await columnAccess(currentUserId(req), columnId);
  const column = await updateColumn(columnId, parse(columnUpdate, req.body));
  res.json(column);
});

columnsRouter.delete('/:columnId', async (req, res) => {
  const { columnId } = parse(params, req.params);
  await columnAccess(currentUserId(req), columnId);
  await deleteColumn(columnId);
  res.status(204).end();
});

columnsRouter.post('/:columnId/tasks', async (req, res) => {
  const { columnId } = parse(params, req.params);
  await columnAccess(currentUserId(req), columnId);
  const task = await createTask(columnId, parse(taskCreate, req.body));
  res.status(201).json(task);
});
