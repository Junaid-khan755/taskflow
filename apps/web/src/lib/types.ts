// Shapes of the JSON the API returns. Dates arrive as ISO strings.

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export type User = { id: string; name: string; email: string };

// Lists of workspaces and the board view include your role in that workspace
export type Workspace = { id: string; name: string; slug: string; role: Role };

export type Member = { role: Role; user: User };

export type Task = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  position: number;
  assigneeId: string | null;
  assignee?: User | null;
};

export type Column = { id: string; boardId: string; name: string; position: number };

export type Board = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
};

export type BoardDetail = Board & { role: Role; columns: (Column & { tasks: Task[] })[] };

/** Fields the user can edit on a task. */
export type TaskInput = {
  title?: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
};
