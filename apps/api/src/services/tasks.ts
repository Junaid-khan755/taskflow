import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../lib/http-error.js';
import { clamp, lockBoardOfColumn, lockBoardOfTask, shiftForMove, type Tx } from './ordering.js';

export type TaskFields = Pick<
  Prisma.TaskUncheckedCreateInput,
  'title' | 'description' | 'priority' | 'dueDate' | 'assigneeId'
>;

// Only people in the board's workspace can be assigned its tasks
async function assertAssignable(tx: Tx, boardId: string, userId: string) {
  const board = await tx.board.findUniqueOrThrow({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  const member = await tx.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: board.workspaceId, userId } },
  });
  if (!member) throw new HttpError(400, 'Assignee must be a member of this workspace');
}

/** Adds a task to the bottom of a column. */
export function createTask(columnId: string, data: TaskFields) {
  return prisma.$transaction(async (tx) => {
    const boardId = await lockBoardOfColumn(tx, columnId);
    if (data.assigneeId) await assertAssignable(tx, boardId, data.assigneeId);

    const position = await tx.task.count({ where: { columnId } });
    return tx.task.create({ data: { ...data, columnId, position } });
  });
}

/** Edits a task's fields. Moving is separate (see moveTask). */
export async function updateTask(taskId: string, data: Partial<TaskFields>) {
  if (data.assigneeId) {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { column: { select: { boardId: true } } },
    });
    await assertAssignable(prisma, task.column.boardId, data.assigneeId);
  }
  return prisma.task.update({ where: { id: taskId }, data });
}

/** Moves a task to `position` in `columnId` (same or different column). */
export function moveTask(taskId: string, columnId: string, position: number) {
  return prisma.$transaction(async (tx) => {
    const boardId = await lockBoardOfTask(tx, taskId);
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });

    const target = await tx.column.findUnique({ where: { id: columnId } });
    if (!target || target.boardId !== boardId) {
      throw new HttpError(400, 'Target column must be on the same board');
    }

    let pos: number;
    if (columnId === task.columnId) {
      const count = await tx.task.count({ where: { columnId } });
      pos = clamp(position, 0, count - 1);
      const shift = shiftForMove(task.position, pos);
      if (shift) {
        await tx.task.updateMany({
          where: { columnId, position: shift.range },
          data: { position: shift.change },
        });
      }
    } else {
      // Close the gap in the old column, then make room in the new one
      await tx.task.updateMany({
        where: { columnId: task.columnId, position: { gt: task.position } },
        data: { position: { decrement: 1 } },
      });
      const count = await tx.task.count({ where: { columnId } });
      pos = clamp(position, 0, count);
      await tx.task.updateMany({
        where: { columnId, position: { gte: pos } },
        data: { position: { increment: 1 } },
      });
    }

    return tx.task.update({ where: { id: taskId }, data: { columnId, position: pos } });
  });
}

/** Deletes a task and closes the gap it leaves. */
export function deleteTask(taskId: string) {
  return prisma.$transaction(async (tx) => {
    await lockBoardOfTask(tx, taskId);
    const task = await tx.task.delete({ where: { id: taskId } });
    await tx.task.updateMany({
      where: { columnId: task.columnId, position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    });
  });
}
