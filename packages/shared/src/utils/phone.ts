// Accepts 03001234567, 3001234567, +923001234567, 923001234567, 00923001234567 (spaces/dashes allowed)
const PAKISTANI_MOBILE = /^(?:\+92|0092|92|0)?3\d{9}$/;

// Returns the number as +923001234567, or null if it is not a Pakistani mobile number
export function normalizePakistaniMobile(input: string): string | null {
  const compact = input.replace(/[\s-]/g, '');
  if (!PAKISTANI_MOBILE.test(compact)) return null;
  return `+92${compact.replace(/^(?:\+92|0092|92|0)/, '')}`;
}

// +923001234567 → "0300 1234567"
export function formatPakistaniMobile(e164: string) {
  const local = e164.replace(/^\+92/, '0');
  return `${local.slice(0, 4)} ${local.slice(4)}`;
}