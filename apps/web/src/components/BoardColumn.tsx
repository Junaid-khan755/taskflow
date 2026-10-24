import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCreateTask, useDeleteColumn, useUpdateColumn } from '../lib/queries';
import type { Column, Task } from '../lib/types';
import { AddInline, InlineForm } from './InlineForm';
import { TaskCard } from './TaskCard';

export function BoardColumn({
  column,
  tasks,
  onOpenTask,
}: {
  column: Column;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const createTask = useCreateTask(column.boardId);
  const updateColumn = useUpdateColumn(column.boardId);
  const deleteColumn = useDeleteColumn(column.boardId);

  // Makes the column a drop target, so tasks can be dropped into an empty column
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      aria-label={column.name}
      className="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-slate-900 p-3"
    >
      <header className="mb-3 flex items-center gap-2">
        {renaming ? (
          <InlineForm
            initial={column.name}
            placeholder="Column name"
            submitLabel="Save"
            onSubmit={(name) => {
              updateColumn.mutate({ id: column.id, name });
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <button
              onClick={() => setRenaming(true)}
              title="Rename column"
              className="truncate text-sm font-semibold hover:text-indigo-300"
            >
              {column.name}
            </button>
            <span className="rounded-full bg-slate-800 px-2 text-xs text-slate-400">
              {tasks.length}
            </span>
            <button
              onClick={() => {
                const warning = tasks.length
                  ? `Delete "${column.name}" and its ${tasks.length} task(s)?`
                  : `Delete "${column.name}"?`;
                if (confirm(warning)) deleteColumn.mutate(column.id);
              }}
              className="ml-auto text-xs text-slate-500 hover:text-red-400"
              aria-label={`Delete column ${column.name}`}
            >
              ✕
            </button>
          </>
        )}
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-12 flex-col gap-2 overflow-y-auto rounded-lg p-0.5 transition-colors ${
            isOver ? 'bg-slate-800/50' : ''
          }`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </div>
      </SortableContext>

      <div className="mt-2">
        <AddInline
          label="+ Add task"
          placeholder="Task title"
          onAdd={(title) => createTask.mutate({ columnId: column.id, title })}
        />
      </div>
    </section>
  );
}
