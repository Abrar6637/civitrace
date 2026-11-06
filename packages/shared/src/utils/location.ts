import type { GeoPoint, LocationRef, UnionCouncil } from '../schemas/location';

// "UC-112 Township", "UC-112" ya "Township"
export function formatUnionCouncil(uc: UnionCouncil) {
  if (uc.number && uc.name) return `UC-${uc.number} ${uc.name}`;
  if (uc.number) return `UC-${uc.number}`;
  return uc.name ?? '';
}

// Do GPS points ke darmiyan fasla (meters mein)
export function distanceInMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const norm = (s?: string) => (s ?? '').trim().toLowerCase();

// Tasdeeq wali location asal complaint se mel khati hai ya nahi
export function isSameArea(a: LocationRef, b: LocationRef) {
  const ucMatch =
    (!!a.unionCouncil.number && norm(a.unionCouncil.number) === norm(b.unionCouncil.number)) ||
    (!!a.unionCouncil.name && norm(a.unionCouncil.name) === norm(b.unionCouncil.name));

  return (
    norm(a.district) === norm(b.district) &&
    norm(a.tehsil) === norm(b.tehsil) &&
    ucMatch &&
    norm(a.settlement.name) === norm(b.settlement.name)
  );
}
// "Lahore" → "LAH", "Dera Ghazi Khan" → "DGK", "Toba Tek Singh" → "TTS"
export function districtCode(district: string) {
  const words = district.trim().split(/\s+/);
  const code = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '').slice(0, 3);
  return code.slice(0, 3).toUpperCase();
}