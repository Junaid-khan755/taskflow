import type { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../lib/http-error.js';

export type Tx = Prisma.TransactionClient;

// Columns and tasks are ordered lists with positions 0, 1, 2, ...
// Changing the order means shifting other rows, which takes several queries.
// If two requests did that at the same time, positions could end up duplicated.
// So every ordering change first locks the board row (SELECT ... FOR UPDATE):
// a second request on the same board waits until the first transaction commits.
// Other boards are not blocked.

async function lockOne(rows: Promise<{ id: string }[]>, what: string) {
  const [row] = await rows;
  if (!row) throw new HttpError(404, `${what} not found`);
  return row.id;
}

export function lockBoard(tx: Tx, boardId: string) {
  return lockOne(
    tx.$queryRaw`SELECT id FROM boards WHERE id = ${boardId}::uuid FOR UPDATE`,
    'Board',
  );
}

/** Locks the board that contains the column. Returns the board id. */
export function lockBoardOfColumn(tx: Tx, columnId: string) {
  return lockOne(
    tx.$queryRaw`
      SELECT b.id FROM boards b
      JOIN columns c ON c.board_id = b.id
      WHERE c.id = ${columnId}::uuid
      FOR UPDATE OF b`,
    'Column',
  );
}

/** Locks the board that contains the task. Returns the board id. */
export function lockBoardOfTask(tx: Tx, taskId: string) {
  return lockOne(
    tx.$queryRaw`
      SELECT b.id FROM boards b
      JOIN columns c ON c.board_id = b.id
      JOIN tasks t ON t.column_id = c.id
      WHERE t.id = ${taskId}::uuid
      FOR UPDATE OF b`,
    'Task',
  );
}

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * When an item moves from `from` to `to` inside the same list, the items in
 * between shift by one to fill the gap. Returns which positions to shift and
 * how, or null if nothing moves.
 *
 * Example: moving position 1 to 3 in [A, B, C, D] gives [A, C, D, B].
 * C and D (positions 2..3) move up by one.
 */
export function shiftForMove(from: number, to: number) {
  if (to > from) {
    return { range: { gt: from, lte: to }, change: { decrement: 1 } };
  }
  if (to < from) {
    return { range: { gte: to, lt: from }, change: { increment: 1 } };
  }
  return null;
}
