import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { endSession, startSession } from '../lib/session.js';
import { parse } from '../lib/validate.js';
import { currentUserId, requireAuth } from '../middleware/auth.js';
import { login, register } from './schemas.js';

export const authRouter = Router();

const publicUser = { id: true, name: true, email: true } as const;

// Slows down password guessing: 20 attempts per IP every 15 minutes.
// Off in tests, which make many logins in a row on purpose.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

authRouter.post('/register', limiter, async (req, res) => {
  const { name, email, password } = parse(register, req.body);

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists');
  }
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
    select: publicUser,
  });

  await startSession(res, user.id);
  res.status(201).json(user);
});

// Used when the email doesn't exist, so the response takes as long as a
// real password check. Otherwise timing would reveal which emails exist.
const dummyHash = hashPassword('not-a-real-password');

authRouter.post('/login', limiter, async (req, res) => {
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

authRouter.post('/logout', (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUserId(req) },
    select: publicUser,
  });
  res.json(user);
});
