import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ensureProfile,
  setProfileRole,
  updateProfile,
} from '../src/modules/profiles/profiles.repo.js';
import { createAuthUser, createTestDb, resetDb } from './setup/db.js';

describe('profiles repo', () => {
  const db = createTestDb();

  beforeEach(async () => {
    await resetDb(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it('ensureProfile creates an active student profile', async () => {
    const id = await createAuthUser(db);

    const profile = await ensureProfile(db, { id, phone: '+919876543210', email: null });

    expect(profile).toMatchObject({
      id,
      role: 'student',
      status: 'active',
      phone: '+919876543210',
      email: null,
      fullName: null,
    });
  });

  it('ensureProfile returns the existing row on a second call', async () => {
    const id = await createAuthUser(db);
    const first = await ensureProfile(db, { id, phone: '+919876543210', email: null });

    const second = await ensureProfile(db, { id, phone: '+919999999999', email: 'x@y.com' });

    expect(second).toEqual(first);
  });

  it('concurrent ensureProfile calls create exactly one row', async () => {
    const id = await createAuthUser(db);
    const input = { id, phone: '+919876543210', email: null };

    const [a, b] = await Promise.all([ensureProfile(db, input), ensureProfile(db, input)]);

    expect(a).toEqual(b);
    const rows = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from profiles where id = ${id}`,
    );
    expect(rows[0]?.count).toBe('1');
  });

  it('updateProfile stores values as given and bumps updated_at', async () => {
    const id = await createAuthUser(db);
    const created = await ensureProfile(db, { id, phone: null, email: null });

    const updated = await updateProfile(db, id, { fullName: '  Asha  ', email: 'asha@example.com' });

    expect(updated.fullName).toBe('  Asha  ');
    expect(updated.email).toBe('asha@example.com');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it('updateProfile leaves fields that are not in the patch unchanged', async () => {
    const id = await createAuthUser(db);
    await ensureProfile(db, { id, phone: null, email: 'keep@example.com' });

    const updated = await updateProfile(db, id, { fullName: 'Ravi' });

    expect(updated.email).toBe('keep@example.com');
  });

  it('setProfileRole changes the role', async () => {
    const id = await createAuthUser(db);
    await ensureProfile(db, { id, phone: null, email: 'admin@example.com' });

    const updated = await setProfileRole(db, id, 'admin');

    expect(updated.role).toBe('admin');
  });
});
