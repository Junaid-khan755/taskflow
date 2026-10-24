import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { Prisma } from '../generated/prisma/client.js';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
};

// Known Prisma error codes that are the client's fault, not a server bug.
// Full list: https://www.prisma.io/docs/orm/reference/error-reference
const prismaErrors: Record<string, [number, string]> = {
  P2002: [409, 'A record with this value already exists'],
  P2003: [400, 'A referenced record does not exist'],
  P2025: [404, 'Record not found'],
};

// Express recognizes error handlers by their 4 arguments, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // express.json() throws this when the request body isn't valid JSON
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code in prismaErrors) {
    const [status, message] = prismaErrors[err.code];
    res.status(status).json({ error: message });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    // Never leak stack traces to users in production
    ...(env.NODE_ENV === 'development' && { details: String(err) }),
  });
};
