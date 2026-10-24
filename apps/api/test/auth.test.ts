import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { api, newAgent, PASSWORD, signUp } from './helpers.js';

describe('auth', () => {
  it('signs up, sets an httpOnly cookie, and remembers the user', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Ann', email: 'Ann@Example.com', password: PASSWORD })
      .expect(201);

    expect(res.body).toEqual({ id: expect.any(String), name: 'Ann', email: 'ann@example.com' });
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^taskflow_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await api.get('/api/auth/me').expect(200);
    expect(me.body.email).toBe('ann@example.com');
  });

  it('stores a hash, never the password, and never returns it', async () => {
    const user = await signUp('Ann');
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(user)).not.toMatch(/password/i);
  });

  it('rejects a duplicate email and a short password', async () => {
    await signUp('Ann');
    await newAgent()
      .post('/api/auth/register')
      .send({ name: 'Ann 2', email: 'ann@example.com', password: PASSWORD })
      .expect(409);
    await newAgent()
      .post('/api/auth/register')
      .send({ name: 'Bo', email: 'bo@example.com', password: 'short' })
      .expect(400);
  });

  it('logs in with the right password only', async () => {
    await signUp('Ann', newAgent());

    const wrong = await api
      .post('/api/auth/login')
      .send({ email: 'ann@example.com', password: 'wrong-password' })
      .expect(401);
    // Same message for a wrong password and an unknown email
    const unknown = await api
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD })
      .expect(401);
    expect(wrong.body.error).toBe(unknown.body.error);

    await api
      .post('/api/auth/login')
      .send({ email: 'ANN@example.com', password: PASSWORD })
      .expect(200);
    await api.get('/api/auth/me').expect(200);
  });

  it('logs out', async () => {
    await signUp('Ann');
    await api.post('/api/auth/logout').expect(204);
    await api.get('/api/auth/me').expect(401);
  });

  it('blocks protected routes without a valid session', async () => {
    await api.get('/api/workspaces').expect(401);
    await api
      .get('/api/workspaces')
      .set('Cookie', 'taskflow_session=forged.token.here')
      .expect(401);
  });

  it('locks out a deleted user even if their token is still valid', async () => {
    const user = await signUp('Ann');
    await prisma.user.delete({ where: { id: user.id } });
    await api.get('/api/workspaces').expect(401);
  });
});

describe('sessions', () => {
  /** Signs up with a plain request (no cookie jar) and returns the raw cookie. */
  async function signUpAndGetCookie() {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ name: 'Ann', email: 'ann@example.com', password: PASSWORD })
      .expect(201);
    return res.headers['set-cookie']![0].split(';')[0];
  }

  it('kills the token on logout, even if someone copied it', async () => {
    const app = createApp();
    const cookie = await signUpAndGetCookie();
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);

    // The stolen copy no longer works
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('stores only a hash of the token in the database', async () => {
    const cookie = await signUpAndGetCookie();
    const token = cookie.split('=')[1];
    const session = await prisma.session.findFirstOrThrow();
    expect(session.tokenHash).not.toBe(token);
    expect(session.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects an expired session and deletes it', async () => {
    const cookie = await signUpAndGetCookie();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    await request(createApp()).get('/api/auth/me').set('Cookie', cookie).expect(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('keeps other devices logged in when one logs out', async () => {
    const laptop = await signUpAndGetCookie();
    const phone = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'ann@example.com', password: PASSWORD })
      .expect(200);
    const phoneCookie = phone.headers['set-cookie']![0].split(';')[0];

    await request(createApp()).post('/api/auth/logout').set('Cookie', laptop).expect(204);
    await request(createApp()).get('/api/auth/me').set('Cookie', phoneCookie).expect(200);
  });
});

describe('sign-up and login input', () => {
  const signUpWith = (password: string, email = 'bo@example.com') =>
    newAgent().post('/api/auth/register').send({ name: 'Bo', email, password });

  it('refuses passwords that are only spaces or very common', async () => {
    const spaces = await signUpWith('          ').expect(400);
    expect(spaces.body.details.password).toEqual(["Password can't be only spaces"]);

    for (const common of ['12345678', 'password123', 'PASSWORD1']) {
      const res = await signUpWith(common).expect(400);
      expect(res.body.details.password[0]).toMatch(/too common/);
    }
  });

  it('accepts an email with spaces around it', async () => {
    const res = await signUpWith(PASSWORD, '  bo@example.com  ').expect(201);
    expect(res.body.email).toBe('bo@example.com');
  });

  it('gives friendly messages, not technical ones', async () => {
    const res = await newAgent()
      .post('/api/auth/register')
      .send({ name: '   ', email: 'bad', password: PASSWORD })
      .expect(400);
    expect(res.body.details).toEqual({
      name: ['Please enter your name'],
      email: ['Enter a valid email address'],
    });
  });

  it('refuses a huge request with 413, not a server error', async () => {
    const res = await api
      .post('/api/auth/login')
      .send({ email: 'ann@example.com', password: 'a'.repeat(200_000) })
      .expect(413);
    expect(res.body.error).toBe('Request is too large');
  });
});

describe('rate limiting', () => {
  // A separate app with the limits switched on (they're off in other tests).
  // Each createApp() gets its own counters, so tests don't affect each other.
  const loginAs = (app: Express, email: string, password: string) =>
    request(app).post('/api/auth/login').send({ email, password });

  it('never blocks the real owner for logging in successfully', async () => {
    await signUp('Ann', newAgent());
    const app = createApp({ rateLimit: true });
    for (let i = 0; i < 25; i++) {
      await loginAs(app, 'ann@example.com', PASSWORD).expect(200);
    }
  });

  it('blocks an account after 10 wrong passwords, but not other accounts', async () => {
    await signUp('Ann', newAgent());
    await signUp('Bob', newAgent());
    const app = createApp({ rateLimit: true });

    for (let i = 0; i < 10; i++) {
      await loginAs(app, 'ann@example.com', `guess-${i}`).expect(401);
    }
    const blocked = await loginAs(app, 'ann@example.com', 'guess-10').expect(429);
    expect(blocked.body.error).toMatch(/Too many attempts/);

    // Bob, on the same network, can still log in
    await loginAs(app, 'bob@example.com', PASSWORD).expect(200);
  });

  it('limits sign-ups from one address', async () => {
    const app = createApp({ rateLimit: true });
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Spam', email: `spam${i}@example.com`, password: PASSWORD })
        .expect(201);
    }
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Spam', email: 'spam10@example.com', password: PASSWORD })
      .expect(429);
  });
});
