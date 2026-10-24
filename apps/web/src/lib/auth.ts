import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Role, User } from './types';

// The logged-in user lives in the query cache under ['me'].
// null means "checked, and nobody is logged in".
export const meKey = ['me'] as const;

export const useMe = () =>
  useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: Infinity,
  });

type Credentials = { email: string; password: string };

/**
 * Drops every cached board and task, so the next person to use this browser
 * can't see the previous user's data, then stores who is logged in now.
 * ['me'] itself is updated, not removed: components like the header are
 * subscribed to it, and a removed query would leave them showing stale data.
 */
function switchUser(qc: QueryClient, user: User | null) {
  qc.removeQueries({ predicate: (query) => query.queryKey[0] !== meKey[0] });
  qc.setQueryData(meKey, user);
}

function useAuthMutation<T>(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => api.post<User>(path, data),
    onSuccess: (user) => switchUser(qc, user),
    // The form shows the error itself, so skip the global toast
    meta: { silent: true },
  });
}

export const useLogin = () => useAuthMutation<Credentials>('/auth/login');

export const useRegister = () => useAuthMutation<Credentials & { name: string }>('/auth/register');

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => switchUser(qc, null),
  });
}

/** Admins and owners can manage boards and members. */
export const canManage = (role: Role | undefined) => role === 'OWNER' || role === 'ADMIN';
