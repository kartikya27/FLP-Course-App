import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { profiles, type Profile, type ProfileRole } from '../../db/schema/index.js';

export async function ensureProfile(
  db: Db,
  input: { id: string; phone: string | null; email: string | null },
): Promise<Profile> {
  await db
    .insert(profiles)
    .values({ id: input.id, phone: input.phone, email: input.email })
    .onConflictDoNothing({ target: profiles.id });

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, input.id));
  if (!profile) throw new Error(`Profile ${input.id} is missing after insert`);
  return profile;
}

export async function updateProfile(
  db: Db,
  id: string,
  patch: { fullName?: string; email?: string | null },
): Promise<Profile> {
  const [profile] = await db
    .update(profiles)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(profiles.id, id))
    .returning();
  if (!profile) throw new Error(`Profile ${id} not found`);
  return profile;
}

export async function setProfileRole(db: Db, id: string, role: ProfileRole): Promise<Profile> {
  const [profile] = await db
    .update(profiles)
    .set({ role, updatedAt: sql`now()` })
    .where(eq(profiles.id, id))
    .returning();
  if (!profile) throw new Error(`Profile ${id} not found`);
  return profile;
}
