const DAY = 86_400_000;

// Kitne din se pending hai
export function formatAge(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}
// Short date for chart axes, e.g. "12 Oct"
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
// 850 → "850 m", 2400 → "2.4 km"
export function formatLength(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

// "03001234567" → "0300•••••567" (privacy in lists)
export function maskPhone(phone?: string) {
  if (!phone) return 'Not available';
  return phone.length > 7 ? `${phone.slice(0, 4)}•••••${phone.slice(-3)}` : '•••••';
}