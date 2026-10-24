import type { ProfileDto } from '../../src/lib/api';

export function makeProfile(overrides: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: '6f1c2a4e-0000-4000-8000-000000000002',
    role: 'student',
    fullName: 'Asha Verma',
    phone: '+919876543210',
    email: null,
    status: 'active',
    ...overrides,
  };
}
