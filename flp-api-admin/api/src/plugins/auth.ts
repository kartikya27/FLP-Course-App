import type { onRequestAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { Db } from '../db/client.js';
import type { Profile } from '../db/schema/index.js';
import { AppError } from '../lib/errors.js';
import type { TokenVerifier } from '../lib/token-verifier.js';
import { ensureProfile } from '../modules/profiles/profiles.repo.js';

declare module 'fastify' {
  interface FastifyRequest {
    profile: Profile;
  }
  interface FastifyInstance {
    // Run as onRequest hooks so auth errors come before body validation errors.
    authenticate: onRequestAsyncHookHandler;
    requireAdmin: onRequestAsyncHookHandler;
  }
  interface FastifyContextConfig {
    // Lets a blocked user through (GET /v1/me, so the app can show the blocked screen).
    allowBlocked?: boolean;
  }
}

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in again');

// Postgres foreign_key_violation: the token is valid but its auth.users row is gone.
function isForeignKeyViolation(err: unknown): boolean {
  const code = (e: unknown) => (e as { code?: unknown } | null)?.code;
  return code(err) === '23503' || code((err as { cause?: unknown } | null)?.cause) === '23503';
}

export const authPlugin = fp<{ db: Db; verifyToken: TokenVerifier }>(
  async (app, { db, verifyToken }) => {
    app.decorateRequest('profile', null as unknown as Profile);

    app.decorate('authenticate', async (request) => {
      const header = request.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
      if (!token) throw unauthenticated();

      const claims = await verifyToken(token);
      let profile: Profile;
      try {
        profile = await ensureProfile(db, { id: claims.sub, phone: claims.phone, email: claims.email });
      } catch (err) {
        if (isForeignKeyViolation(err)) throw unauthenticated();
        throw err;
      }

      if (profile.status === 'blocked' && !request.routeOptions.config.allowBlocked) {
        throw new AppError(403, 'ACCOUNT_BLOCKED', 'Your account is blocked. Please contact support.');
      }
      request.profile = profile;
    });

    app.decorate('requireAdmin', async (request) => {
      if (request.profile?.role !== 'admin') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this.');
      }
    });
  },
  { name: 'auth' },
);
