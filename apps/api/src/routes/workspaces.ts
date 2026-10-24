import { Router } from 'express';
import { prisma } from '../db.js';
import { workspaceAccess } from '../lib/access.js';
import { HttpError } from '../lib/http-error.js';
import { parse } from '../lib/validate.js';
import { currentUserId } from '../middleware/auth.js';
import { boardCreate, idParams, memberAdd, workspaceCreate } from './schemas.js';

export const workspacesRouter = Router();

const params = idParams('workspaceId');

// Only the workspaces you belong to, each with your role in it
workspacesRouter.get('/', async (req, res) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: currentUserId(req) },
    orderBy: { joinedAt: 'asc' },
    select: { role: true, workspace: true },
  });
  res.json(memberships.map(({ role, workspace }) => ({ ...workspace, role })));
});

// The creator becomes the owner
workspacesRouter.post('/', async (req, res) => {
  const data = parse(workspaceCreate, req.body);
  const workspace = await prisma.workspace.create({
    data: { ...data, members: { create: { userId: currentUserId(req), role: 'OWNER' } } },
  });
  res.status(201).json({ ...workspace, role: 'OWNER' });
});

workspacesRouter.get('/:workspaceId/boards', async (req, res) => {
  const { workspaceId } = parse(params, req.params);
  await workspaceAccess(currentUserId(req), workspaceId);
  const boards = await prisma.board.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(boards);
});

workspacesRouter.post('/:workspaceId/boards', async (req, res) => {
  const { workspaceId } = parse(params, req.params);
  await workspaceAccess(currentUserId(req), workspaceId);
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

const memberSelect = {
  role: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

workspacesRouter.get('/:workspaceId/members', async (req, res) => {
  const { workspaceId } = parse(params, req.params);
  await workspaceAccess(currentUserId(req), workspaceId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { joinedAt: 'asc' },
    select: memberSelect,
  });
  res.json(members);
});

// Admins add people who already have an account
workspacesRouter.post('/:workspaceId/members', async (req, res) => {
  const { workspaceId } = parse(params, req.params);
  await workspaceAccess(currentUserId(req), workspaceId, 'ADMIN');
  const { email, role } = parse(memberAdd, req.body);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new HttpError(404, 'No account uses this email. Ask them to sign up first.');

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (existing) throw new HttpError(409, 'This person is already a member');

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, role },
    select: memberSelect,
  });
  res.status(201).json(member);
});

workspacesRouter.delete('/:workspaceId/members/:userId', async (req, res) => {
  const { workspaceId, userId } = parse(idParams('workspaceId', 'userId'), req.params);
  await workspaceAccess(currentUserId(req), workspaceId, 'ADMIN');

  const member = await prisma.workspaceMember.findUniqueOrThrow({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (member.role === 'OWNER') throw new HttpError(400, "The workspace owner can't be removed");

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  // Their tasks stay, but nobody should be assigned work in a workspace
  // they've left
  await prisma.task.updateMany({
    where: { assigneeId: userId, column: { board: { workspaceId } } },
    data: { assigneeId: null },
  });
  res.status(204).end();
});
