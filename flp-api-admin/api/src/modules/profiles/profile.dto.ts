import { z } from 'zod';
import type { Profile } from '../../db/schema/index.js';

export const profileDtoSchema = z.object({
  id: z.uuid(),
  role: z.enum(['student', 'admin']),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.enum(['active', 'blocked']),
});

export type ProfileDto = z.infer<typeof profileDtoSchema>;

export function toProfileDto(profile: Profile): ProfileDto {
  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    status: profile.status,
  };
}
