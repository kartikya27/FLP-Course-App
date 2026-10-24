import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Comma-separated list of origins allowed to call the API from a browser (the admin panel).
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Server only. Needed by the seed script and admin user management, not by the request path.
  // Blank (as in a fresh copy of .env.example) counts as not set.
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
