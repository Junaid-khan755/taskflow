import type { Request, RequestHandler } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { readSession, SESSION_COOKIE } from '../lib/session.js';

// Lets TypeScript know about the user id that requireAuth adds to req
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

/** Rejects requests without a valid session with 401. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const userId = await readSession(req.cookies?.[SESSION_COOKIE]);
  // Also check the user still exists, so deleted accounts are locked out
  // even though their token's signature is still valid
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  if (!user) throw new HttpError(401, 'Please log in');

  req.userId = user.id;
  next();
};

/** The logged-in user's id. Only use in routes behind requireAuth. */
export function currentUserId(req: Request) {
  if (!req.userId) throw new HttpError(401, 'Please log in');
  return req.userId;
}
