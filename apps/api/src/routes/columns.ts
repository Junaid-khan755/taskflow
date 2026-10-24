import { Router } from 'express';
import { parse } from '../lib/validate.js';
import { deleteColumn, updateColumn } from '../services/columns.js';
import { createTask } from '../services/tasks.js';
import { columnUpdate, idParams, taskCreate } from './schemas.js';

export const columnsRouter = Router();

const params = idParams('columnId');

columnsRouter.patch('/:columnId', async (req, res) => {
  const { columnId } = parse(params, req.params);
  const column = await updateColumn(columnId, parse(columnUpdate, req.body));
  res.json(column);
});

columnsRouter.delete('/:columnId', async (req, res) => {
  const { columnId } = parse(params, req.params);
  await deleteColumn(columnId);
  res.status(204).end();
});

columnsRouter.post('/:columnId/tasks', async (req, res) => {
  const { columnId } = parse(params, req.params);
  const task = await createTask(columnId, parse(taskCreate, req.body));
  res.status(201).json(task);
});
