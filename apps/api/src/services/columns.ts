import { prisma } from '../db.js';
import { clamp, lockBoard, lockBoardOfColumn, shiftForMove } from './ordering.js';

/** Adds a column at `position` (default: the end), shifting later columns right. */
export function createColumn(boardId: string, name: string, position?: number) {
  return prisma.$transaction(async (tx) => {
    await lockBoard(tx, boardId);
    const count = await tx.column.count({ where: { boardId } });
    const pos = clamp(position ?? count, 0, count);

    await tx.column.updateMany({
      where: { boardId, position: { gte: pos } },
      data: { position: { increment: 1 } },
    });
    return tx.column.create({ data: { boardId, name, position: pos } });
  });
}

/** Renames and/or moves a column. */
export function updateColumn(columnId: string, data: { name?: string; position?: number }) {
  return prisma.$transaction(async (tx) => {
    const boardId = await lockBoardOfColumn(tx, columnId);
    // Read after locking, so the position can't change under us
    const column = await tx.column.findUniqueOrThrow({ where: { id: columnId } });

    let position = column.position;
    if (data.position !== undefined) {
      const count = await tx.column.count({ where: { boardId } });
      position = clamp(data.position, 0, count - 1);
      const shift = shiftForMove(column.position, position);
      if (shift) {
        await tx.column.updateMany({
          where: { boardId, position: shift.range },
          data: { position: shift.change },
        });
      }
    }

    return tx.column.update({ where: { id: columnId }, data: { name: data.name, position } });
  });
}

/** Deletes a column (and its tasks) and closes the gap it leaves. */
export function deleteColumn(columnId: string) {
  return prisma.$transaction(async (tx) => {
    const boardId = await lockBoardOfColumn(tx, columnId);
    const column = await tx.column.delete({ where: { id: columnId } });
    await tx.column.updateMany({
      where: { boardId, position: { gt: column.position } },
      data: { position: { decrement: 1 } },
    });
  });
}
