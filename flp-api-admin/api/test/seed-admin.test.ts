import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { seedAdmin } from '../src/modules/profiles/seed-admin.js';
import { createAuthUser, createTestDb, resetDb } from './setup/db.js';

describe('seedAdmin', () => {
  const db = createTestDb();

  beforeEach(async () => {
    await resetDb(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it('creates the auth user and gives the profile the admin role', async () => {
    const created: Array<{ email: string; password: string }> = [];
    const createUser = async (email: string, password: string) => {
      created.push({ email, password });
      return { id: await createAuthUser(db) };
    };

    const profile = await seedAdmin(db, createUser, { email: 'owner@flp.example', password: 's3cret-pass' });

    expect(created).toEqual([{ email: 'owner@flp.example', password: 's3cret-pass' }]);
    expect(profile).toMatchObject({ role: 'admin', status: 'active', email: 'owner@flp.example' });
  });
});
