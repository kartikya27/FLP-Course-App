import { buildApp, type App } from '../../src/app.js';
import type { Db } from '../../src/db/client.js';
import { createTokenVerifier, type TokenVerifier } from '../../src/lib/token-verifier.js';
import { createTestDb } from '../setup/db.js';
import { createTestKeys, TEST_ISSUER, type TestKeys } from './tokens.js';

export interface TestContext {
  app: App;
  db: Db;
  keys: TestKeys;
  close(): Promise<void>;
}

export async function createTestContext(opts: { verifyToken?: TokenVerifier } = {}): Promise<TestContext> {
  const db = createTestDb();
  const keys = await createTestKeys();
  const app = await buildApp({
    db,
    verifyToken: opts.verifyToken ?? createTokenVerifier({ issuer: TEST_ISSUER, jwks: keys.jwks }),
  });

  return {
    app,
    db,
    keys,
    close: async () => {
      await app.close();
      await db.$client.end();
    },
  };
}
