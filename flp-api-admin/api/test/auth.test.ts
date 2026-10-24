import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setProfileRole, ensureProfile } from '../src/modules/profiles/profiles.repo.js';
import { createTokenVerifier } from '../src/lib/token-verifier.js';
import { createTestContext, type TestContext } from './helpers/app.js';
import { createTestKeys, TEST_ISSUER } from './helpers/tokens.js';
import { createAuthUser, resetDb } from './setup/db.js';

const UNAUTHENTICATED = { error: { code: 'UNAUTHENTICATED', message: 'Please log in again' } };

describe('authentication', () => {
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

  function getMe(headers: Record<string, string> = {}) {
    return ctx.app.inject({ method: 'GET', url: '/v1/me', headers });
  }

  it('rejects a request without a token', async () => {
    const res = await getMe();

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHENTICATED);
  });

  it('rejects a header that is not a bearer token', async () => {
    const res = await getMe({ authorization: 'Token abc' });

    expect(res.statusCode).toBe(401);
  });

  it('rejects an expired token', async () => {
    const sub = await createAuthUser(ctx.db);
    const token = await ctx.keys.signToken({ sub, expiresIn: Math.floor(Date.now() / 1000) - 60 });

    const res = await getMe({ authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHENTICATED);
  });

  it('rejects a token from another issuer', async () => {
    const sub = await createAuthUser(ctx.db);
    const token = await ctx.keys.signToken({ sub, iss: 'https://evil.example.com/auth/v1' });

    const res = await getMe({ authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(401);
  });

  it('rejects a token for another audience', async () => {
    const sub = await createAuthUser(ctx.db);
    const token = await ctx.keys.signToken({ sub, aud: 'anon' });

    const res = await getMe({ authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(401);
  });

  it('rejects a token signed by a different key', async () => {
    const sub = await createAuthUser(ctx.db);
    const otherKeys = await createTestKeys();
    const token = await otherKeys.signToken({ sub });

    const res = await getMe({ authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(401);
  });

  it('answers 401, not 500, when the JWKS cannot be fetched', async () => {
    const broken = await createTestContext({
      verifyToken: createTokenVerifier({
        issuer: TEST_ISSUER,
        jwks: async () => {
          throw new Error('getaddrinfo ENOTFOUND test-project.supabase.co');
        },
      }),
    });
    try {
      const sub = await createAuthUser(broken.db);
      const token = await broken.keys.signToken({ sub });

      const res = await broken.app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual(UNAUTHENTICATED);
    } finally {
      await broken.close();
    }
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const token = await ctx.keys.signToken({ sub: randomUUID() });

    const res = await getMe({ authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHENTICATED);
  });

  it('checks the token before validating the body', async () => {
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: '/v1/me',
      payload: { fullName: 1 },
    });

    expect(res.statusCode).toBe(401);
  });

  describe('admin routes', () => {
    it('refuses a student', async () => {
      const sub = await createAuthUser(ctx.db);
      const token = await ctx.keys.signToken({ sub });

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/v1/admin/ping',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
    });

    it('lets an admin in', async () => {
      const sub = await createAuthUser(ctx.db);
      await ensureProfile(ctx.db, { id: sub, phone: null, email: 'admin@example.com' });
      await setProfileRole(ctx.db, sub, 'admin');
      const token = await ctx.keys.signToken({ sub, email: 'admin@example.com' });

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/v1/admin/ping',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });

    it('refuses an unauthenticated caller with 401', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: '/v1/admin/ping' });

      expect(res.statusCode).toBe(401);
    });
  });
});
