// Thin wrapper around fetch: sends JSON, and turns error responses into
// ApiError so components can show the server's message.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // For validation errors, show the first field's message ("name: Too small...")
    const details = data?.details as Record<string, string[]> | undefined;
    const [field, messages] = Object.entries(details ?? {})[0] ?? [];
    const message = field ? `${field}: ${messages?.[0]}` : (data?.error ?? res.statusText);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};
