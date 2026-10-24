import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env on its own.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env — rely on the shell environment.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  // Supabase owns the auth schema; only generate migrations for public.
  schemaFilter: ['public'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
