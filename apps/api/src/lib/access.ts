import { prisma } from '../db.js';
import type { Role } from '../generated/prisma/client.js';
import { HttpError } from './http-error.js';

// Permission checks. Every board, column and task belongs to a workspace,
// and you can only touch it if you're a member of that workspace.
//
// Not a member -> 404, not 403. Saying "forbidden" would confirm the board
// exists, which leaks information to people who shouldn't know about it.
// A member without a high enough role -> 403.

const rank: Record<Role, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

function check(member: { role: Role } | null, what: string, min: Role) {
  if (!member) throw new HttpError(404, `${what} not found`);
  if (rank[member.role] < rank[min]) {
    throw new HttpError(403, `Only workspace ${min.toLowerCase()}s can do this`);
  }
  return member.role;
}

// Each check is a single query: "find my membership in the workspace that
// contains this board/column/task".

export async function workspaceAccess(userId: string, workspaceId: string, min: Role = 'MEMBER') {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return check(member, 'Workspace', min);
}

export async function boardAccess(userId: string, boardId: string, min: Role = 'MEMBER') {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { boards: { some: { id: boardId } } } },
    select: { role: true },
  });
  return check(member, 'Board', min);
}

export async function columnAccess(userId: string, columnId: string, min: Role = 'MEMBER') {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { boards: { some: { columns: { some: { id: columnId } } } } } },
    select: { role: true },
  });
  return check(member, 'Column', min);
}

export async function taskAccess(userId: string, taskId: string, min: Role = 'MEMBER') {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspace: { boards: { some: { columns: { some: { tasks: { some: { id: taskId } } } } } } },
    },
    select: { role: true },
  });
  return check(member, 'Task', min);
}
