import { useState } from 'react';
import { fromDateInput, toDateInput } from '../lib/dates';
import { useDeleteTask, useMembers, useUpdateTask } from '../lib/queries';
import type { Priority, Task } from '../lib/types';
import { Modal } from './Modal';

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDialog({
  task,
  boardId,
  workspaceId,
  onClose,
}: {
  task: Task;
  boardId: string;
  workspaceId: string;
  onClose: () => void;
}) {
  const members = useMembers(workspaceId);
  const updateTask = useUpdateTask(boardId);
  const deleteTask = useDeleteTask(boardId);

  // Edit a local copy; nothing is saved until the user clicks Save
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: toDateInput(task.dueDate),
    assigneeId: task.assigneeId ?? '',
  });
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          updateTask.mutate(
            {
              id: task.id,
              title: form.title.trim(),
              description: form.description.trim() || null,
              priority: form.priority,
              dueDate: fromDateInput(form.dueDate),
              assigneeId: form.assigneeId || null,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <div>
          <label htmlFor="title" className="label">
            Title
          </label>
          <input id="title" required value={form.title} onChange={set('title')} className="input" />
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={set('description')}
            placeholder="Add more detail..."
            className="input resize-y"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="priority" className="label">
              Priority
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={set('priority')}
              className="input"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dueDate" className="label">
              Due date
            </label>
            <input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              className="input [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="assignee" className="label">
              Assignee
            </label>
            <select
              id="assignee"
              value={form.assigneeId}
              onChange={set('assigneeId')}
              className="input"
            >
              <option value="">Unassigned</option>
              {members.data?.map(({ user }) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (confirm(`Delete "${task.title}"?`)) {
                deleteTask.mutate(task.id, { onSuccess: onClose });
              }
            }}
          >
            Delete
          </button>
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">
            Cancel
          </button>
          <button type="submit" disabled={updateTask.isPending} className="btn-primary">
            {updateTask.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
