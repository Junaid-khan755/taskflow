import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDue } from '../lib/dates';
import type { Priority, Task } from '../lib/types';

const priorityStyles: Record<Priority, string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-sky-950 text-sky-300',
  HIGH: 'bg-amber-950 text-amber-300',
  URGENT: 'bg-red-950 text-red-300',
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** What a card looks like. Shared by the card in the list and the drag preview. */
export function TaskCardContent({ task }: { task: Task }) {
  const due = task.dueDate ? formatDue(task.dueDate) : null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-sm">
      <p className="text-sm break-words">{task.title}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`rounded px-1.5 py-0.5 font-medium ${priorityStyles[task.priority]}`}>
          {task.priority.toLowerCase()}
        </span>
        {due && (
          <span className={due.overdue ? 'text-red-400' : 'text-slate-400'}>📅 {due.label}</span>
        )}
        {task.assignee && (
          <span
            title={task.assignee.name}
            className="ml-auto flex size-6 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-semibold"
          >
            {initials(task.assignee.name)}
          </span>
        )}
      </div>
    </div>
  );
}

/** A card that can be dragged, clicked, or opened with Enter. */
export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Space picks the card up to move it (dnd-kit); Enter opens it
        if (e.key === 'Enter') onOpen();
        else listeners?.onKeyDown?.(e);
      }}
      aria-label={`Task: ${task.title}`}
      className={`cursor-grab rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <TaskCardContent task={task} />
    </div>
  );
}
