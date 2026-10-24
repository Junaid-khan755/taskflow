import { Router } from 'express';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { boardCreate, idParams, workspaceCreate } from './schemas.js';

export const workspacesRouter = Router();

// Lists every workspace for now. Once auth lands (Phase 2) this will return
// only the workspaces the logged-in user belongs to.
workspacesRouter.get('/', async (_req, res) => {
  const workspaces = await prisma.workspace.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(workspaces);
});

workspacesRouter.post('/', async (req, res) => {
  const data = parse(workspaceCreate, req.body);
  const workspace = await prisma.workspace.create({ data });
  res.status(201).json(workspace);
});

workspacesRouter.get('/:workspaceId/boards', async (req, res) => {
  const { workspaceId } = parse(idParams('workspaceId'), req.params);
  // findUniqueOrThrow gives a 404 if the workspace doesn't exist,
  // instead of an empty list that hides the mistake
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { boards: { orderBy: { createdAt: 'asc' } } },
  });
  res.json(workspace.boards);
});

workspacesRouter.post('/:workspaceId/boards', async (req, res) => {
  const { workspaceId } = parse(idParams('workspaceId'), req.params);
  const { columns, ...data } = parse(boardCreate, req.body);

  // Nested create: the board and its columns are inserted in one transaction
  const board = await prisma.board.create({
    data: {
      ...data,
      workspaceId,
      columns: { create: columns.map((name, position) => ({ name, position })) },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  res.status(201).json(board);
});
