import type {
  CitizenConfirmationState,
  ComplaintCategory,
  ComplaintStatus,
  ConfirmationResponse,
  RejectionReason,
} from './complaint';
import type { VerificationState } from './verification';
import type { SettlementType } from '../schemas/location';

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  road_missing: 'Road missing',
  pothole: 'Pothole',
  broken_road: 'Broken road',
  streetlight: 'Streetlight',
  drainage: 'Drainage',
  water_supply: 'Water supply',
  bridge: 'Bridge / culvert',
  other: 'Other',
};

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  published: 'Published',
  routed: 'Routed',
  acknowledged: 'Acknowledged',
  action_planned: 'Action planned',
  in_progress: 'In progress',
  awaiting_confirmation: 'Awaiting confirmation',
  resolved: 'Resolved',
  reopened: 'Reopened',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  citizen_reported: 'Citizen reported',
  under_review: 'Under review',
  documented: 'Documented',
  admin_verified: 'Admin verified',
  officially_acknowledged: 'Officially acknowledged',
  disputed: 'Disputed',
  not_available: 'Not available',
};

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  city: 'City',
  town: 'Town',
  village: 'Village',
};

export const CITIZEN_CONFIRMATION_LABELS: Record<CitizenConfirmationState, string> = {
  not_requested: 'Not requested',
  pending: 'Waiting for citizen',
  confirmed: 'Confirmed by citizen',
  disputed: 'Disputed by citizen',
  no_response: 'No response from citizen',
};

export const CONFIRMATION_RESPONSE_LABELS: Record<ConfirmationResponse, string> = {
  resolved: 'Fixed',
  partially_resolved: 'Partially fixed',
  not_resolved: 'Not fixed',
};

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  duplicate: 'Duplicate complaint',
  spam: 'Spam / abusive',
  wrong_location: 'Wrong or unclear location',
  not_infrastructure: 'Not an infrastructure issue',
  insufficient_evidence: 'Photo does not show the issue',
  private_property: 'Private property',
  other: 'Other',
};