import type { CookieOptions, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';

// After login, the user gets a signed token (JWT) holding their user id.
// The signature proves we issued it, so we don't need a database lookup to
// trust it. It lives in a cookie the browser sends automatically.

export const SESSION_COOKIE = 'taskflow_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
const secret = new TextEncoder().encode(env.JWT_SECRET);

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

export async function startSession(res: Response, userId: string) {
  const token = await new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_SECONDS * 1000 });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Returns the user id if the token is valid and not expired, otherwise null. */
export async function readSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
