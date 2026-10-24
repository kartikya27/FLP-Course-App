import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// prepare: false — the Supabase pooler runs in transaction mode, which does not support prepared statements.
export function createDb(url: string) {
  return drizzle(postgres(url, { prepare: false }), { schema });
}

export type Db = ReturnType<typeof createDb>;
