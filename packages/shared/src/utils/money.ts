// Amounts are stored in paisa (minor units): Rs 1 = 100 paisa
export const MINOR_PER_RUPEE = 100;

export function rupeesToMinor(rupees: number) {
  return Math.round(rupees * MINOR_PER_RUPEE);
}

// Full amount, e.g. "Rs 25,000,000"
export function formatRupees(minor: number) {
  const rupees = minor / MINOR_PER_RUPEE;
  return `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(rupees)}`;
}

const trim = (n: number) => Number(n.toFixed(2)).toString();

// Pakistani units: 1 lakh = 100,000 and 1 crore = 10,000,000
export function formatRupeesCompact(minor: number) {
  const rupees = minor / MINOR_PER_RUPEE;
  if (rupees >= 10_000_000) return `Rs ${trim(rupees / 10_000_000)} crore`;
  if (rupees >= 100_000) return `Rs ${trim(rupees / 100_000)} lakh`;
  return formatRupees(minor);
}