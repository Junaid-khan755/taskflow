// Thin wrapper around fetch: sends JSON, and turns error responses into
// ApiError with a message that can be shown to the user as it is.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const CANT_REACH_SERVER = "Can't reach the server. Check your connection and try again.";
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';

/** Picks the most useful message from an error response. */
function errorMessage(status: number, data: { error?: string; details?: unknown } | null) {
  // 502/503/504 come from the proxy or host when the API is down or restarting
  if (status === 502 || status === 503 || status === 504) {
    return CANT_REACH_SERVER;
  }
  if (status >= 500) {
    return SERVER_ERROR;
  }

  // Validation errors: { details: { email: ["Enter a valid email address"] } }.
  // The API writes these messages for users, so show the first one.
  const details = data?.details as Record<string, string[]> | undefined;
  if (details) {
    const firstMessages = Object.values(details)[0];
    if (firstMessages?.[0]) {
      return firstMessages[0];
    }
  }

  return data?.error ?? SERVER_ERROR;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch itself only fails when there's no connection at all
    throw new ApiError(0, CANT_REACH_SERVER);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(res.status, data));
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};
