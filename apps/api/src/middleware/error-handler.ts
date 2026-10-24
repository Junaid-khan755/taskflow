import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
};

// Express recognizes error handlers by their 4 arguments, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    // Never leak stack traces to users in production
    ...(env.NODE_ENV === 'development' && { details: String(err) }),
  });
};
