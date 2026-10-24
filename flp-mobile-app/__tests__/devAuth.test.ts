import Config from 'react-native-config';
import { devStudentProfile, isDevStudentPhone } from '../src/dev/devAuth';

const config = Config as Record<string, string | undefined>;

describe('isDevStudentPhone', () => {
  const realDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    delete config.DEV_AUTH;
    delete config.DEV_STUDENT_PHONE;
    (globalThis as { __DEV__?: boolean }).__DEV__ = realDev;
  });

  it('matches the configured dev phone however it was typed in .env', () => {
    config.DEV_AUTH = 'true';
    config.DEV_STUDENT_PHONE = '98765 43210';

    expect(isDevStudentPhone('+919876543210')).toBe(true);
    expect(isDevStudentPhone('+919999999999')).toBe(false);
  });

  it('is off unless DEV_AUTH is "true"', () => {
    config.DEV_STUDENT_PHONE = '9876543210';

    expect(isDevStudentPhone('+919876543210')).toBe(false);
  });

  it('is off in release builds', () => {
    config.DEV_AUTH = 'true';
    config.DEV_STUDENT_PHONE = '9876543210';
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    expect(isDevStudentPhone('+919876543210')).toBe(false);
  });
});

describe('devStudentProfile', () => {
  it('is an active student who still has to enter a name', () => {
    expect(devStudentProfile('+919876543210')).toMatchObject({
      role: 'student',
      status: 'active',
      phone: '+919876543210',
      fullName: null,
    });
  });
});
