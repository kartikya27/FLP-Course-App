import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const required = {
  DATABASE_URL: 'postgresql://localhost:5432/flp',
  SUPABASE_URL: 'https://abc.supabase.co',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(required);

    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.NODE_ENV).toBe('development');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('rejects an invalid port', () => {
    expect(() => loadEnv({ ...required, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('requires DATABASE_URL and SUPABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL[\s\S]*SUPABASE_URL/);
  });

  it('treats a blank optional value as not set, like a fresh copy of .env.example', () => {
    const env = loadEnv({ ...required, SUPABASE_SERVICE_ROLE_KEY: '' });

    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
