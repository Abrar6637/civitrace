import { formatUnionCouncil, type LocationRef } from '@civitrace/shared';
import i18n from '../i18n';

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  try {
    return date.toLocaleString(i18n.language === 'ur' ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function formatLocation(loc: LocationRef) {
  return [loc.address, loc.settlement.name, formatUnionCouncil(loc.unionCouncil), loc.tehsil, loc.district]
    .filter(Boolean)
    .join('، ');
}
// For plain dates like "2026-11-09"
export function formatDate(date: string) {
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  try {
    return d.toLocaleDateString(i18n.language === 'ur' ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date.slice(0, 10);
  }
}