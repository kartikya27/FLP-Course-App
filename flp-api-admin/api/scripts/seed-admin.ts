// Creates an admin who can log in to the admin panel.
// Usage: npm run seed:admin -w api -- --email owner@example.com --password '<password>'
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../src/config/env.js';
import { createDb } from '../src/db/client.js';
import { seedAdmin } from '../src/modules/profiles/seed-admin.js';

const { values } = parseArgs({
  options: { email: { type: 'string' }, password: { type: 'string' } },
});
if (!values.email || !values.password) {
  console.error("Usage: npm run seed:admin -w api -- --email <email> --password '<password>'");
  process.exit(1);
}

const env = loadEnv();
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing from api/.env');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const db = createDb(env.DATABASE_URL);

try {
  const profile = await seedAdmin(
    db,
    async (email, password) => {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`Could not create the Supabase user: ${error.message}`);
      return { id: data.user.id };
    },
    { email: values.email, password: values.password },
  );
  console.log(`Admin ready: ${profile.email} (${profile.id})`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
