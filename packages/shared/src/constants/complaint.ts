// Documentation section 4.1: infrastructure categories
export const COMPLAINT_CATEGORIES = [
  'road_missing',
  'pothole',
  'broken_road',
  'streetlight',
  'drainage',
  'water_supply',
  'bridge',
  'other',
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

// Complaint lifecycle (citizen confirmation ke saath)
export const COMPLAINT_STATUSES = [
  'submitted',
  'under_review',
  'published',
  'routed',
  'acknowledged',
  'action_planned',
  'in_progress',
  'awaiting_confirmation', // admin ne "kaam ho gaya" kaha, citizen ka jawab baqi
  'resolved', // citizen ne tasdeeq kar di
  'reopened', // citizen ne kaha theek nahi hua
  'closed',
  'rejected',
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

// Yeh statuses sirf saboot (evidence) ke saath set ho sakte hain
export const EVIDENCE_REQUIRED_STATUSES: readonly ComplaintStatus[] = [
  'routed',
  'acknowledged',
  'awaiting_confirmation',
];

// Citizen ki tasdeeq ki halat
export const CITIZEN_CONFIRMATION_STATES = [
  'not_requested',
  'pending',
  'confirmed',
  'disputed',
  'no_response',
] as const;

export type CitizenConfirmationState = (typeof CITIZEN_CONFIRMATION_STATES)[number];

// Citizen in mein se ek jawab dega
export const CONFIRMATION_RESPONSES = ['resolved', 'partially_resolved', 'not_resolved'] as const;
export type ConfirmationResponse = (typeof CONFIRMATION_RESPONSES)[number];

export const CONFIRMATION_WINDOW_DAYS = 14;
export const CONFIRMATION_MAX_DISTANCE_M = 300;
// Admin kis status se kis status par le ja sakta hai.
// 'resolved' aur 'reopened' sirf citizen ke jawab se aate hain, admin inhein set nahi kar sakta.
export const STATUS_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['published', 'rejected'],
  published: ['routed', 'rejected'],
  routed: ['acknowledged'],
  acknowledged: ['action_planned', 'in_progress'],
  action_planned: ['in_progress'],
  in_progress: ['awaiting_confirmation'],
  awaiting_confirmation: [], // citizen ke jawab ka intezaar
  resolved: ['closed'],
  reopened: ['in_progress', 'awaiting_confirmation'],
  closed: [],
  rejected: [],
};

export const REJECTION_REASONS = [
  'duplicate',
  'spam',
  'wrong_location',
  'not_infrastructure',
  'insufficient_evidence',
  'private_property',
  'other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];
// Statuses where the work is not finished
export const OPEN_COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'submitted',
  'under_review',
  'published',
  'routed',
  'acknowledged',
  'action_planned',
  'in_progress',
  'awaiting_confirmation',
  'reopened',
];

// Duplicate suggestions: same category within this distance and time window
export const DUPLICATE_RADIUS_M = 200;
export const DUPLICATE_WINDOW_DAYS = 180;