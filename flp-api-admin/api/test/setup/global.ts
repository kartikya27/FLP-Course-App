import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { createDb } from '../../src/db/client.js';
import { prepareTestDb } from './db.js';
import { TEST_DATABASE_URL, TEST_DB_NAME, TEST_DB_PORT } from './test-db-config.js';

export async function setup(): Promise<() => Promise<void>> {
  const pg = new EmbeddedPostgres({
    databaseDir: await mkdtemp(join(tmpdir(), 'flp-api-test-pg-')),
    user: 'postgres',
    password: 'postgres',
    port: TEST_DB_PORT,
    persistent: false,
    onLog: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(TEST_DB_NAME);

  const db = createDb(TEST_DATABASE_URL);
  try {
    await prepareTestDb(db);
  } finally {
    await db.$client.end();
  }

  return async () => {
    await pg.stop();
  };
}
