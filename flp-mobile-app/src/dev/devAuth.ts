import Config from 'react-native-config';
import type { ProfileDto } from '../lib/api';
import { normalizeIndianPhone } from '../lib/phone';

// Development-only student login that skips the Supabase SMS, so the UI can be viewed before a
// project exists. Enabled by DEV_AUTH=true and DEV_STUDENT_PHONE in .env; __DEV__ is false in
// release builds, so it never activates there.
export function isDevStudentPhone(phone: string): boolean {
  if (!__DEV__ || Config.DEV_AUTH !== 'true') return false;
  const devPhone = normalizeIndianPhone(Config.DEV_STUDENT_PHONE ?? '');
  return devPhone !== null && devPhone === phone;
}

export function devStudentProfile(phone: string): ProfileDto {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'student',
    fullName: null,
    phone,
    email: null,
    status: 'active',
  };
}
