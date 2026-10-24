import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { profiles } from '../src/db/schema/index.js';
import { createTestContext, type TestContext } from './helpers/app.js';
import { createAuthUser, resetDb } from './setup/db.js';

describe('/v1/me', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await resetDb(ctx.db);
  });

  afterAll(async () => {
    await ctx.close();
  });

  async function studentToken(claims: { phone?: string; email?: string } = {}) {
    const sub = await createAuthUser(ctx.db);
    return { sub, token: await ctx.keys.signToken({ sub, ...claims }) };
  }

  function getMe(token: string) {
    return ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
  }

  function patchMe(token: string, payload: unknown) {
    return ctx.app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: payload as Record<string, unknown>,
    });
  }

  it('creates the profile on the first request, with the phone in +91 form', async () => {
    const { sub, token } = await studentToken({ phone: '919876543210', email: '' });

    const res = await getMe(token);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: sub,
      role: 'student',
      fullName: null,
      phone: '+919876543210',
      email: null,
      status: 'active',
    });
  });

  it('creates exactly one profile when first requests arrive together', async () => {
    const { sub, token } = await studentToken({ phone: '919876543210' });

    const [a, b] = await Promise.all([getMe(token), getMe(token)]);

    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    const rows = await ctx.db.execute<{ count: string }>(
      sql`select count(*)::text as count from profiles where id = ${sub}`,
    );
    expect(rows[0]?.count).toBe('1');
  });

  it('lets a blocked user read their profile but nothing else', async () => {
    const { sub, token } = await studentToken();
    await getMe(token);
    await ctx.db.update(profiles).set({ status: 'blocked' }).where(sql`id = ${sub}`);

    const read = await getMe(token);
    const write = await patchMe(token, { fullName: 'Asha Verma' });

    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ status: 'blocked' });
    expect(write.statusCode).toBe(403);
    expect(write.json()).toEqual({ error: { code: 'ACCOUNT_BLOCKED', message: expect.any(String) } });
  });

  it('saves a trimmed name and an email', async () => {
    const { token } = await studentToken();

    const res = await patchMe(token, { fullName: '  Asha Verma  ', email: 'asha@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ fullName: 'Asha Verma', email: 'asha@example.com' });
  });

  it('rejects a name shorter than 2 characters after trimming', async () => {
    const { token } = await studentToken();

    const res = await patchMe(token, { fullName: ' A ' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message: expect.any(String) } });
  });

  it('rejects a name longer than 80 characters', async () => {
    const { token } = await studentToken();

    const res = await patchMe(token, { fullName: 'a'.repeat(81) });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const { token } = await studentToken();

    const res = await patchMe(token, { email: 'asha@' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('clears the email when sent null', async () => {
    const { token } = await studentToken({ email: 'old@example.com' });
    await getMe(token);

    const res = await patchMe(token, { email: null });

    expect(res.json()).toMatchObject({ email: null });
  });

  it('ignores an attempt to change the role', async () => {
    const { token } = await studentToken();

    const res = await patchMe(token, { fullName: 'Asha Verma', role: 'admin', status: 'active' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'student' });
  });
});
