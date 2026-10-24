// Accepts what people actually type ("098765 43210", "+91 98765-43210", "9876543210")
// and returns E.164 (+91XXXXXXXXXX), or null if it isn't a valid Indian mobile number.
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/[\s-]/g, '');

  if (digits.startsWith('+')) {
    if (!digits.startsWith('+91')) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
