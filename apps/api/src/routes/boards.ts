import { Router } from 'express';
import { prisma } from '../db.js';
import { boardAccess } from '../lib/access.js';
import { parse } from '../lib/validate.js';
import { currentUserId } from '../middleware/auth.js';
import { createColumn } from '../services/columns.js';
import { boardUpdate, columnCreate, idParams } from './schemas.js';

export const boardsRouter = Router();

const params = idParams('boardId');

// The full board in one request: columns in order, each with its tasks in order.
// This is what the board screen needs, so the frontend makes one call, not many.
// It also includes your role, so the UI can hide actions you aren't allowed.
boardsRouter.get('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  const role = await boardAccess(currentUserId(req), boardId);
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
  res.json({ ...board, role });
});

// Renaming and deleting whole boards is for admins and owners
boardsRouter.patch('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  await boardAccess(currentUserId(req), boardId, 'ADMIN');
  const data = parse(boardUpdate, req.body);
  const board = await prisma.board.update({ where: { id: boardId }, data });
  res.json(board);
});

boardsRouter.delete('/:boardId', async (req, res) => {
  const { boardId } = parse(params, req.params);
  await boardAccess(currentUserId(req), boardId, 'ADMIN');
  await prisma.board.delete({ where: { id: boardId } });
  res.status(204).end();
});

boardsRouter.post('/:boardId/columns', async (req, res) => {
  const { boardId } = parse(params, req.params);
  await boardAccess(currentUserId(req), boardId);
  const { name, position } = parse(columnCreate, req.body);
  const column = await createColumn(boardId, name, position);
  res.status(201).json(column);
});
