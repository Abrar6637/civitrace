import { PUNJAB_DISTRICTS } from '@civitrace/shared';

// Finds a Punjab district name inside the phone's map data (city, subregion, etc.)
export function guessDistrict(candidates: (string | null | undefined)[]) {
  for (const value of candidates) {
    if (!value) continue;
    const text = value.toLowerCase();
    const hit = PUNJAB_DISTRICTS.find((d) => text.includes(d.toLowerCase()));
    if (hit) return hit;
  }
  return undefined;
}