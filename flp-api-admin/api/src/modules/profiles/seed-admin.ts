import type { Db } from '../../db/client.js';
import type { Profile } from '../../db/schema/index.js';
import { ensureProfile, setProfileRole } from './profiles.repo.js';

export type CreateAuthUser = (email: string, password: string) => Promise<{ id: string }>;

export async function seedAdmin(
  db: Db,
  createUser: CreateAuthUser,
  input: { email: string; password: string },
): Promise<Profile> {
  const user = await createUser(input.email, input.password);
  await ensureProfile(db, { id: user.id, phone: null, email: input.email });
  return setProfileRole(db, user.id, 'admin');
}
