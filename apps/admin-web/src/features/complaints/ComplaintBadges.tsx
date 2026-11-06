import {
  STATUS_LABELS,
  VERIFICATION_LABELS,
  type ComplaintStatus,
  type VerificationState,
} from '@civitrace/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const STATUS_TONES: Record<ComplaintStatus, BadgeTone> = {
  submitted: 'blue',
  under_review: 'amber',
  published: 'teal',
  routed: 'violet',
  acknowledged: 'violet',
  action_planned: 'violet',
  in_progress: 'amber',
  awaiting_confirmation: 'blue',
  resolved: 'green',
  reopened: 'red',
  closed: 'gray',
  rejected: 'red',
};

const VERIFICATION_TONES: Record<VerificationState, BadgeTone> = {
  citizen_reported: 'gray',
  under_review: 'amber',
  documented: 'blue',
  admin_verified: 'green',
  officially_acknowledged: 'teal',
  disputed: 'red',
  not_available: 'gray',
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function VerificationBadge({ state }: { state: VerificationState }) {
  return <Badge tone={VERIFICATION_TONES[state]}>{VERIFICATION_LABELS[state]}</Badge>;
}