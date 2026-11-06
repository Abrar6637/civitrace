// Documentation section 6.1: data source states
export const VERIFICATION_STATES = [
  'citizen_reported',
  'under_review',
  'documented',
  'admin_verified',
  'officially_acknowledged',
  'disputed',
  'not_available',
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];