export const PROJECT_STATUSES = [
  'proposed',
  'approved',
  'tendered',
  'in_progress',
  'completed',
  'stalled',
  'cancelled',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const FUNDING_SOURCES = [
  'provincial_adp',
  'district_adp',
  'federal_psdp',
  'representative_scheme',
  'donor',
  'other',
] as const;
export type FundingSource = (typeof FUNDING_SOURCES)[number];

export const MILESTONE_STATUSES = ['pending', 'in_progress', 'done', 'delayed'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const PROJECT_DOCUMENT_TYPES = [
  'administrative_approval',
  'technical_sanction',
  'work_order',
  'release_letter',
  'measurement_book',
  'completion_certificate',
  'other',
] as const;
export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPES)[number];

export const REPRESENTATIVE_OFFICES = ['MNA', 'MPA'] as const;
export type RepresentativeOffice = (typeof REPRESENTATIVE_OFFICES)[number];

// Documentation 4.3: involvement is recorded only as a specific, evidenced action
export const INVOLVEMENT_TYPES = [
  'requested',
  'recommended',
  'followed_up',
  'funding_supported',
  'inaugurated',
] as const;
export type InvolvementType = (typeof INVOLVEMENT_TYPES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  tendered: 'Tendered',
  in_progress: 'In progress',
  completed: 'Completed',
  stalled: 'Stalled',
  cancelled: 'Cancelled',
};

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  provincial_adp: 'Provincial ADP',
  district_adp: 'District ADP',
  federal_psdp: 'Federal PSDP',
  representative_scheme: 'Representative development scheme',
  donor: 'Donor funded',
  other: 'Other',
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  delayed: 'Delayed',
};

export const PROJECT_DOCUMENT_TYPE_LABELS: Record<ProjectDocumentType, string> = {
  administrative_approval: 'Administrative approval',
  technical_sanction: 'Technical sanction',
  work_order: 'Work order',
  release_letter: 'Fund release letter',
  measurement_book: 'Measurement book',
  completion_certificate: 'Completion certificate',
  other: 'Other document',
};

export const INVOLVEMENT_TYPE_LABELS: Record<InvolvementType, string> = {
  requested: 'Requested the work',
  recommended: 'Recommended the scheme',
  followed_up: 'Followed up with the department',
  funding_supported: 'Supported funding',
  inaugurated: 'Inaugurated',
};

export const PHOTO_STAGES = ['before', 'during', 'after'] as const;
export type PhotoStage = (typeof PHOTO_STAGES)[number];

export const PHOTO_STAGE_LABELS: Record<PhotoStage, string> = {
  before: 'Before work',
  during: 'During work',
  after: 'After work',
};