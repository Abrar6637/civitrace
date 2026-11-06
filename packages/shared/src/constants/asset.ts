import type { ComplaintCategory } from './complaint';

export const ASSET_TYPES = ['road', 'streetlight', 'drain', 'water_line', 'bridge', 'other'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_CONDITIONS = ['good', 'fair', 'poor', 'critical', 'unknown'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

// Which asset type a complaint category belongs to (null = no physical asset yet)
export const CATEGORY_TO_ASSET_TYPE: Record<ComplaintCategory, AssetType | null> = {
  road_missing: null,
  pothole: 'road',
  broken_road: 'road',
  streetlight: 'streetlight',
  drainage: 'drain',
  water_supply: 'water_line',
  bridge: 'bridge',
  other: null,
};

// New complaints within this many years of the last work are flagged as a repeat issue
export const REPEAT_ISSUE_WINDOW_YEARS = 2;

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  road: 'Road',
  streetlight: 'Streetlights',
  drain: 'Drain / sewer',
  water_line: 'Water supply line',
  bridge: 'Bridge / culvert',
  other: 'Other',
};

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  critical: 'Critical',
  unknown: 'Unknown',
};
// Short codes used in asset numbers, e.g. AS-LAH-RD-00012
export const ASSET_TYPE_CODES: Record<AssetType, string> = {
  road: 'RD',
  streetlight: 'SL',
  drain: 'DR',
  water_line: 'WL',
  bridge: 'BR',
  other: 'OT',
};

// Assets within this distance of a complaint are suggested for linking
export const NEARBY_ASSET_RADIUS_M = 1000;