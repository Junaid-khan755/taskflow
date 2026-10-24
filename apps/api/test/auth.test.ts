import { describe, expect, it } from 'vitest';
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
