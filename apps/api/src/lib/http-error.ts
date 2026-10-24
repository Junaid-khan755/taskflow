// Throw this anywhere in a route or service to send a specific status code.
// The error handler turns it into a JSON response.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
