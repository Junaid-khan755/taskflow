import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoardColumn } from '../components/BoardColumn';
import { AddInline, InlineForm } from '../components/InlineForm';
import { TaskCardContent } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { toLayout, type TaskLayout } from '../lib/board';
import {
  useBoard,
  useCreateColumn,
  useDeleteBoard,
  useMoveTask,
  useUpdateBoard,
} from '../lib/queries';

/** Which column holds this id? The id can be a task or a column itself. */
function findColumn(layout: TaskLayout, id: string) {
  if (id in layout) return id;
  return Object.keys(layout).find((columnId) => layout[columnId].includes(id));
}

export function BoardPage() {
  const { boardId = '' } = useParams();
  const navigate = useNavigate();
  const { data: board, isPending, error } = useBoard(boardId);
  const createColumn = useCreateColumn(boardId);
  const updateBoard = useUpdateBoard(boardId);
  const deleteBoard = useDeleteBoard(boardId);
  const moveTask = useMoveTask(boardId);

  const [renaming, setRenaming] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // While dragging, the card's live position is kept here so it can jump
  // between columns as the pointer moves. When not dragging it's null and
  // the board from the server is shown.
  const [dragLayout, setDragLayout] = useState<TaskLayout | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Pointer: a 5px move starts a drag, so a simple click still opens the task.
  // Keyboard: focus a card, Space to pick up, arrows to move, Space to drop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const tasksById = useMemo(
    () => new Map(board?.columns.flatMap((c) => c.tasks).map((t) => [t.id, t])),
    [board],
  );

  if (isPending) return <p className="p-8 text-slate-400">Loading board...</p>;
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400">Couldn't load this board: {error.message}</p>
        <Link to="/" className="mt-2 inline-block text-indigo-400 hover:underline">
          ← Back to all boards
        </Link>
      </div>
    );
  }

  const layout = dragLayout ?? toLayout(board);

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragLayout(toLayout(board!));
  }

  // Fires as the card passes over other cards/columns. Moving between
  // columns is handled here so the card visibly jumps into the new column.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDragLayout((prev) => {
      if (!prev) return prev;
      const activeKey = String(active.id);
      const overKey = String(over.id);
      const from = findColumn(prev, activeKey);
      const to = findColumn(prev, overKey);
      if (!from || !to || from === to) return prev;

      const target = prev[to];
      const overIndex = target.indexOf(overKey);
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== activeKey),
        [to]: [...target.slice(0, index), activeKey, ...target.slice(index)],
      };
    });
  }

  // Fires on drop. Works out the final column and position, then saves.
  function onDragEnd({ active, over }: DragEndEvent) {
    const current = dragLayout;
    setActiveId(null);
    setDragLayout(null);
    if (!over || !current) return;

    const taskId = String(active.id);
    const columnId = findColumn(current, taskId);
    if (!columnId) return;

    const items = current[columnId];
    const overIndex = items.indexOf(String(over.id));
    const finalItems = overIndex >= 0 ? arrayMove(items, items.indexOf(taskId), overIndex) : items;
    const position = finalItems.indexOf(taskId);

    const original = tasksById.get(taskId);
    if (original?.columnId === columnId && original.position === position) return;
    moveTask({ taskId, columnId, position });
  }

  const activeTask = activeId ? tasksById.get(activeId) : undefined;
  const openTask = openTaskId ? tasksById.get(openTaskId) : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3 sm:px-6">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-100">
          ← Boards
        </Link>
        {renaming ? (
          <div className="w-72">
            <InlineForm
              initial={board.name}
              placeholder="Board name"
              submitLabel="Save"
              onSubmit={(name) => {
                updateBoard.mutate({ name });
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          </div>
        ) : (
          <h1>
            <button
              onClick={() => setRenaming(true)}
              title="Rename board"
              className="text-lg font-semibold hover:text-indigo-300"
            >
              {board.name}
            </button>
          </h1>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete the board "${board.name}" and all its tasks?`)) {
              deleteBoard.mutate(undefined, { onSuccess: () => navigate('/') });
            }
          }}
          className="btn-danger ml-auto"
        >
          Delete board
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDragLayout(null);
        }}
      >
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4 sm:p-6">
          {board.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={(layout[column.id] ?? [])
                .map((id) => tasksById.get(id))
                .filter((t) => t !== undefined)}
              onOpenTask={setOpenTaskId}
            />
          ))}
          <div className="w-72 shrink-0">
            <AddInline
              label="+ Add column"
              placeholder="Column name"
              closeOnSubmit
              onAdd={(name) => createColumn.mutate({ name })}
            />
          </div>
        </div>

        {/* The floating copy of the card that follows the pointer */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 cursor-grabbing">
              <TaskCardContent task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskDialog
          key={openTask.id}
          task={openTask}
          boardId={boardId}
          workspaceId={board.workspaceId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
