import type { BoardDetail } from './types';

/**
 * Returns a copy of the board with a task moved to `position` in `columnId`,
 * with every position renumbered. Mirrors what the API does, so the UI can
 * show the result instantly without waiting for the server.
 */
export function applyMove(
  board: BoardDetail,
  taskId: string,
  columnId: string,
  position: number,
): BoardDetail {
  const task = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
  if (!task) return board;

  const columns = board.columns.map((column) => {
    const tasks = column.tasks.filter((t) => t.id !== taskId);
    if (column.id === columnId) {
      tasks.splice(position, 0, { ...task, columnId });
    }
    return { ...column, tasks: tasks.map((t, i) => ({ ...t, position: i })) };
  });
  return { ...board, columns };
}

/** Column id -> ordered task ids. The shape drag-and-drop works with. */
export type TaskLayout = Record<string, string[]>;

export const toLayout = (board: BoardDetail): TaskLayout =>
  Object.fromEntries(board.columns.map((c) => [c.id, c.tasks.map((t) => t.id)]));
