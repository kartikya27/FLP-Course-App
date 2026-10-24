import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb, type Db } from '../../src/db/client.js';
import { TEST_DATABASE_URL } from './test-db-config.js';

export function createTestDb(): Db {
  return createDb(TEST_DATABASE_URL);
}

// Supabase owns auth.users; a plain Postgres test database needs a stand-in so the FK holds.
export async function prepareTestDb(db: Db): Promise<void> {
  await db.execute(sql`create schema if not exists auth`);
  await db.execute(sql`create table if not exists auth.users (id uuid primary key)`);
  await migrate(db, { migrationsFolder: 'drizzle' });
}

export async function resetDb(db: Db): Promise<void> {
  await db.execute(sql`truncate table auth.users cascade`);
}

export async function createAuthUser(db: Db, id: string = randomUUID()): Promise<string> {
  await db.execute(sql`insert into auth.users (id) values (${id})`);
  return id;
}
