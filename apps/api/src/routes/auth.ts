import { Router, type Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { endSession, startSession } from '../lib/session.js';
import { parse } from '../lib/validate.js';
import { currentUserId, requireAuth } from '../middleware/auth.js';
import { login, register } from './schemas.js';

const publicUser = { id: true, name: true, email: true } as const;

const tooManyAttempts = { error: 'Too many attempts. Please wait 15 minutes and try again.' };
const FIFTEEN_MINUTES = 15 * 60 * 1000;

function emailFromBody(req: Request) {
  return String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
}

// Used when the email doesn't exist, so the response takes as long as a
// real password check. Otherwise timing would reveal which emails exist.
const dummyHash = hashPassword('not-a-real-password');

/**
 * `rateLimit: false` turns the limits off. Tests do that, because they log
 * in many times on purpose (except the tests for the limits themselves).
 */
export function createAuthRouter({ rateLimit: enabled }: { rateLimit: boolean }) {
  const router = Router();

  // Stops someone guessing one person's password: 10 wrong tries for the
  // same email from the same address, then wait 15 minutes.
  // Only failures count, so the real owner logging in is never blocked.
  const loginPerAccount = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${emailFromBody(req)}`,
    skip: () => !enabled,
    message: tooManyAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  // Stops someone trying one common password against many accounts:
  // 100 wrong tries from the same address, whatever the email.
  const loginPerAddress = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 100,
    skipSuccessfulRequests: true,
    skip: () => !enabled,
    message: tooManyAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  // Stops one address creating lots of accounts: 10 per hour
  const signupPerAddress = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    skip: () => !enabled,
    message: { error: 'Too many sign-ups from this network. Please try again later.' },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  router.post('/register', signupPerAddress, async (req, res) => {
    const { name, email, password } = parse(register, req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: publicUser,
    });

    await startSession(res, user.id);
    res.status(201).json(user);
  });

  router.post('/login', loginPerAddress, loginPerAccount, async (req, res) => {
    const { email, password } = parse(login, req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
    if (!user || !valid) {
      // Same message either way, so attackers can't tell which part was wrong
      throw new HttpError(401, 'Invalid email or password');
    }

    await startSession(res, user.id);
    res.json({ id: user.id, name: user.name, email: user.email });
  });

  router.post('/logout', async (req, res) => {
    await endSession(req, res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: currentUserId(req) },
      select: publicUser,
    });
    res.json(user);
  });

  return router;
}
