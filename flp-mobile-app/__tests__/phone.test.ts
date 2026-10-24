import { normalizeIndianPhone } from '../src/lib/phone';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['6000000000', '+916000000000'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each([
    ['12345'],
    ['5876543210'],
    [''],
    ['98765432101'],
    ['+1 5551234567'],
    ['98765abcde'],
  ])('rejects %p', input => {
    expect(normalizeIndianPhone(input)).toBeNull();
  });
});
