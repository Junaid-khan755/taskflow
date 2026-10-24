import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db.js';

// How login sessions work:
// 1. On login we create a long random token and put it in a cookie.
// 2. The database stores only a SHA-256 hash of that token, in `sessions`.
// 3. On each request we hash the cookie and look the hash up.
// 4. Logging out deletes the row, so the cookie stops working right away.
//
// Why a plain SHA-256 and not scrypt like passwords? Passwords are short and
// guessable, so they need a slow hash. These tokens are 32 random bytes:
// nobody can guess them, so a fast hash is enough.

export const SESSION_COOKIE = 'taskflow_session';
const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOptions: CookieOptions = {
  // JavaScript in the page can't read it, so an XSS bug can't steal it
  httpOnly: true,
  // HTTPS only in production (localhost uses plain HTTP)
  secure: env.NODE_ENV === 'production',
  // Not sent on requests started by other sites (e.g. a form posting to
  // our API from evil.com), which blocks CSRF attacks
  sameSite: 'lax',
  path: '/',
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('base64url');

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_LENGTH_MS),
    },
  });

  // Housekeeping: remove this user's old expired sessions
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_LENGTH_MS });
}

export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Returns the logged-in user's id, or null if the cookie is missing, unknown or expired. */
export async function getSessionUserId(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token === '') {
    return null;
  }

  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.userId;
}
