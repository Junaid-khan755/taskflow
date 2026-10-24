import type { Request, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';
import { getSessionUserId } from '../lib/session.js';

// Lets TypeScript know about the user id that requireAuth adds to req
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

/** Rejects requests without a valid session with 401. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  // Deleted users have no sessions (they're deleted with the user),
  // so this also locks out deleted accounts
  const userId = await getSessionUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Please log in');
  }

  req.userId = userId;
  next();
};

/** The logged-in user's id. Only use in routes behind requireAuth. */
export function currentUserId(req: Request) {
  if (!req.userId) {
    throw new HttpError(401, 'Please log in');
  }
  return req.userId;
}
