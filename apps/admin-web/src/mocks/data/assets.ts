import { CATEGORY_TO_ASSET_TYPE } from '@civitrace/shared';
import type { Asset, AssetCondition, AssetType, Complaint, ComplaintStatus } from '@civitrace/shared';
import { mockComplaints } from './complaints';

function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(7);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

const NAMES: Record<AssetType, (place: string) => string> = {
  road: (p) => `${p} Main Road`,
  streetlight: (p) => `${p} Street Lights`,
  drain: (p) => `${p} Main Drain`,
  water_line: (p) => `${p} Water Supply Line`,
  bridge: (p) => `${p} Culvert`,
  other: (p) => `${p} Public Works`,
};

const TYPE_CODES: Record<AssetType, string> = {
  road: 'RD',
  streetlight: 'SL',
  drain: 'DR',
  water_line: 'WL',
  bridge: 'BR',
  other: 'OT',
};

const DEPARTMENTS: Record<AssetType, string[]> = {
  road: ['Communication & Works Department', 'Tehsil Municipal Administration'],
  streetlight: ['Tehsil Municipal Administration'],
  drain: ['WASA', 'Tehsil Municipal Administration'],
  water_line: ['Public Health Engineering Department', 'WASA'],
  bridge: ['Communication & Works Department'],
  other: ['Tehsil Municipal Administration'],
};

const LINEAR_TYPES: AssetType[] = ['road', 'drain', 'water_line'];
const FINISHED: ComplaintStatus[] = ['resolved', 'closed', 'rejected'];

function conditionFor(openCount: number): AssetCondition {
  if (openCount >= 3) return 'critical';
  if (openCount === 2) return 'poor';
  if (openCount === 1) return 'fair';
  return 'good';
}

// Group complaints by place + asset type: each group becomes one asset
const groups = new Map<string, Complaint[]>();
for (const c of mockComplaints) {
  const type = CATEGORY_TO_ASSET_TYPE[c.category];
  if (!type) continue;
  const key = [c.location.district, c.location.tehsil, c.location.settlement.name, type].join('|');
  groups.set(key, [...(groups.get(key) ?? []), c]);
}

export const mockAssets: Asset[] = [...groups.values()].map((complaints, index) => {
  const first = complaints[0]!;
  const type = CATEGORY_TO_ASSET_TYPE[first.category]!;
  const seq = String(index + 1).padStart(5, '0');
  const id = `a_${seq}`;
  const districtCode = first.complaintNo.split('-')[1] ?? 'XX';

  const builtKnown = rand() < 0.75;
  const builtYear = builtKnown ? 2010 + Math.floor(rand() * 14) : undefined;
  const lastWorkYear =
    builtYear && rand() < 0.6 ? Math.min(2026, builtYear + 1 + Math.floor(rand() * 6)) : undefined;

  const openCount = complaints.filter((c) => !FINISHED.includes(c.status)).length;
  const oldest = complaints.reduce((min, c) => (c.createdAt < min ? c.createdAt : min), first.createdAt);

  // Link the complaints to this asset
  for (const c of complaints) c.assetId = id;

  return {
    id,
    assetCode: `AS-${districtCode}-${TYPE_CODES[type]}-${seq}`,
    name: NAMES[type](first.location.settlement.name),
    type,
    location: first.location,
    point: first.point,
    lengthM: LINEAR_TYPES.includes(type) ? Math.round(300 + rand() * 4700) : undefined,
    builtYear,
    lastWorkYear,
    ownerDepartment: rand() < 0.85 ? pick(DEPARTMENTS[type]) : undefined,
    condition: conditionFor(openCount),
    verification: builtKnown ? 'documented' : 'citizen_reported',
    createdAt: oldest,
    updatedAt: new Date().toISOString(),
  };
});