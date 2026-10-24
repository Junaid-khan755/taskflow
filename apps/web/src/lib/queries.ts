import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { applyMove } from './board';
import type { Board, BoardDetail, Column, Member, Task, TaskInput, Workspace } from './types';

// TanStack Query caches server data by key. After a change we "invalidate"
// the affected keys, and every component using them refetches automatically.
export const keys = {
  workspaces: ['workspaces'] as const,
  boards: (workspaceId: string) => ['boards', workspaceId] as const,
  members: (workspaceId: string) => ['members', workspaceId] as const,
  board: (boardId: string) => ['board', boardId] as const,
};

export const useWorkspaces = () =>
  useQuery({ queryKey: keys.workspaces, queryFn: () => api.get<Workspace[]>('/workspaces') });

export const useBoards = (workspaceId: string) =>
  useQuery({
    queryKey: keys.boards(workspaceId),
    queryFn: () => api.get<Board[]>(`/workspaces/${workspaceId}/boards`),
  });

export const useMembers = (workspaceId: string) =>
  useQuery({
    queryKey: keys.members(workspaceId),
    queryFn: () => api.get<Member[]>(`/workspaces/${workspaceId}/members`),
  });

export const useBoard = (boardId: string) =>
  useQuery({
    queryKey: keys.board(boardId),
    queryFn: () => api.get<BoardDetail>(`/boards/${boardId}`),
  });

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string }) => api.post<Workspace>('/workspaces', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspaces }),
  });
}

export function useCreateBoard(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post<Board>(`/workspaces/${workspaceId}/boards`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.boards(workspaceId) }),
  });
}

/** All mutations on one board refetch that board when they finish. */
function useBoardMutation<TVars, TResult>(
  boardId: string,
  mutationFn: (vars: TVars) => Promise<TResult>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.board(boardId) }),
  });
}

export function useUpdateBoard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string | null }) =>
      api.patch<Board>(`/boards/${boardId}`, data),
    // The name also shows on the home page list
    onSettled: () => qc.invalidateQueries(),
  });
}

export function useDeleteBoard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/boards/${boardId}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: keys.board(boardId) });
      return qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export const useCreateColumn = (boardId: string) =>
  useBoardMutation(boardId, (data: { name: string }) =>
    api.post<Column>(`/boards/${boardId}/columns`, data),
  );

export const useUpdateColumn = (boardId: string) =>
  useBoardMutation(boardId, ({ id, ...data }: { id: string; name: string }) =>
    api.patch<Column>(`/columns/${id}`, data),
  );

export const useDeleteColumn = (boardId: string) =>
  useBoardMutation(boardId, (columnId: string) => api.delete(`/columns/${columnId}`));

export const useCreateTask = (boardId: string) =>
  useBoardMutation(boardId, ({ columnId, ...data }: TaskInput & { columnId: string }) =>
    api.post<Task>(`/columns/${columnId}/tasks`, data),
  );

export const useUpdateTask = (boardId: string) =>
  useBoardMutation(boardId, ({ id, ...data }: TaskInput & { id: string }) =>
    api.patch<Task>(`/tasks/${id}`, data),
  );

export const useDeleteTask = (boardId: string) =>
  useBoardMutation(boardId, (taskId: string) => api.delete(`/tasks/${taskId}`));

type MoveVars = { taskId: string; columnId: string; position: number };

/**
 * Optimistic update: the card moves on screen immediately. If the server
 * rejects the move, we roll back to the snapshot taken before it.
 *
 * The cache is updated synchronously in move(), not in onMutate (which runs
 * async), so the dropped card never flashes back to its old spot.
 */
export function useMoveTask(boardId: string) {
  const qc = useQueryClient();
  const key = keys.board(boardId);

  const mutation = useMutation({
    mutationFn: ({ taskId, columnId, position }: MoveVars & { previous: BoardDetail }) =>
      api.post<Task>(`/tasks/${taskId}/move`, { columnId, position }),
    onError: (_err, { previous }) => qc.setQueryData(key, previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (vars: MoveVars) => {
    const previous = qc.getQueryData<BoardDetail>(key);
    if (!previous) return;
    // Stop any refetch in flight from overwriting our optimistic state
    void qc.cancelQueries({ queryKey: key });
    qc.setQueryData(key, applyMove(previous, vars.taskId, vars.columnId, vars.position));
    mutation.mutate({ ...vars, previous });
  };
}
