import { createRemoteJWKSet } from 'jose';
import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';
import { createTokenVerifier } from './lib/token-verifier.js';

const env = loadEnv();
const db = createDb(env.DATABASE_URL);
const authUrl = `${env.SUPABASE_URL}/auth/v1`;

const app = await buildApp({
  db,
  verifyToken: createTokenVerifier({
    issuer: authUrl,
    jwks: createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`)),
  }),
  logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
});
app.addHook('onClose', async () => {
  await db.$client.end();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
