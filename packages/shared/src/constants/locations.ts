// Punjab: 10 divisions, 41 districts (Murree, Talagang, Wazirabad,
// Kot Addu aur Taunsa 2022 mein bane). Baad mein yeh backend ki locations API se aayega.
export const PUNJAB_DIVISIONS = [
  { name: 'Bahawalpur', districts: ['Bahawalnagar', 'Bahawalpur', 'Rahim Yar Khan'] },
  { name: 'Dera Ghazi Khan', districts: ['Dera Ghazi Khan', 'Kot Addu', 'Layyah', 'Muzaffargarh', 'Rajanpur', 'Taunsa'] },
  { name: 'Faisalabad', districts: ['Chiniot', 'Faisalabad', 'Jhang', 'Toba Tek Singh'] },
  { name: 'Gujranwala', districts: ['Gujranwala', 'Narowal', 'Sialkot'] },
  { name: 'Gujrat', districts: ['Gujrat', 'Hafizabad', 'Mandi Bahauddin', 'Wazirabad'] },
  { name: 'Lahore', districts: ['Kasur', 'Lahore', 'Nankana Sahib', 'Sheikhupura'] },
  { name: 'Multan', districts: ['Khanewal', 'Lodhran', 'Multan', 'Vehari'] },
  { name: 'Rawalpindi', districts: ['Attock', 'Chakwal', 'Jhelum', 'Murree', 'Rawalpindi', 'Talagang'] },
  { name: 'Sahiwal', districts: ['Okara', 'Pakpattan', 'Sahiwal'] },
  { name: 'Sargodha', districts: ['Bhakkar', 'Khushab', 'Mianwali', 'Sargodha'] },
] as const;

export type PunjabDivision = (typeof PUNJAB_DIVISIONS)[number]['name'];
export type PunjabDistrict = (typeof PUNJAB_DIVISIONS)[number]['districts'][number];

// A se Z tak saare districts ki seedhi list
export const PUNJAB_DISTRICTS: readonly PunjabDistrict[] = PUNJAB_DIVISIONS.flatMap(
  (d) => d.districts
).sort();

// District ka division maloom karein, jaise "Kasur" → "Lahore"
export function getDivisionOf(district: string): PunjabDivision | undefined {
  return PUNJAB_DIVISIONS.find((d) => (d.districts as readonly string[]).includes(district))?.name;
}