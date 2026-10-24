import { Router } from 'express';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { createColumn } from '../services/columns.js';
import { boardUpdate, columnCreate, idParams } from './schemas.js';

export const boardsRouter = Router();

const params = idParams('boardId');

// The full board in one request: columns in order, each with its tasks in order.
// This is what the board screen needs, so the frontend makes one call, not many.
boardsRouter.get('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  const board = await prisma.board.findUniqueOrThrow({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: { assignee: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  res.json(board);
});

boardsRouter.patch('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  const data = parse(boardUpdate, req.body);
  const board = await prisma.board.update({ where: { id: boardId }, data });
  res.json(board);
});

boardsRouter.delete('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  await prisma.board.delete({ where: { id: boardId } });
  res.status(204).end();
});

boardsRouter.post('/:boardId/columns', async (req, res) => {
  const { boardId } = parse(params, req.params);
  const { name, position } = parse(columnCreate, req.body);
  const column = await createColumn(boardId, name, position);
  res.status(201).json(column);
});
