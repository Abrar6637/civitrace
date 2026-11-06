export const REVIEW_PERIODS = ['3m', '6m', '12m', 'ad_hoc'] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];
export type ScheduledPeriod = Exclude<ReviewPeriod, 'ad_hoc'>;

export const REVIEW_PERIOD_MONTHS: Record<ScheduledPeriod, number> = { '3m': 3, '6m': 6, '12m': 12 };

// A feedback window stays open this many days after it opens
export const FEEDBACK_WINDOW_DAYS = 30;

export const DAMAGE_TYPES = [
  'none',
  'cracks',
  'potholes',
  'surface_worn',
  'edge_broken',
  'waterlogging',
  'drain_blocked',
  'lights_not_working',
  'structural_damage',
  'other',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const FEEDBACK_REVIEW_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type FeedbackReviewStatus = (typeof FEEDBACK_REVIEW_STATUSES)[number];

export const REVIEW_PERIOD_LABELS: Record<ReviewPeriod, string> = {
  '3m': '3 months',
  '6m': '6 months',
  '12m': '12 months',
  ad_hoc: 'Damage report',
};

export const CONDITION_SCORE_LABELS: Record<number, string> = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Very good',
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  none: 'No damage',
  cracks: 'Cracks',
  potholes: 'Potholes',
  surface_worn: 'Surface worn out',
  edge_broken: 'Broken edges',
  waterlogging: 'Water standing',
  drain_blocked: 'Drain blocked',
  lights_not_working: 'Lights not working',
  structural_damage: 'Structural damage',
  other: 'Other',
};

export const FEEDBACK_REVIEW_STATUS_LABELS: Record<FeedbackReviewStatus, string> = {
  pending: 'Waiting for review',
  accepted: 'Accepted',
  rejected: 'Not accepted',
};

export const FEEDBACK_DISCLAIMER =
  'Citizen observations, not an engineering assessment. Only accepted feedback is counted.';