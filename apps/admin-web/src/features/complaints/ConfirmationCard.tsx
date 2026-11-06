import { AlertTriangle, Clock, Star } from 'lucide-react';
import {
  CITIZEN_CONFIRMATION_LABELS,
  CONFIRMATION_MAX_DISTANCE_M,
  CONFIRMATION_RESPONSE_LABELS,
  SETTLEMENT_TYPE_LABELS,
  formatUnionCouncil,
  type CitizenConfirmationState,
  type Complaint,
  type ResolutionConfirmation,
} from '@civitrace/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/format';

const TONES: Record<CitizenConfirmationState, BadgeTone> = {
  not_requested: 'gray',
  pending: 'blue',
  confirmed: 'green',
  disputed: 'red',
  no_response: 'amber',
};

type Props = {
  complaint: Complaint;
  confirmation: ResolutionConfirmation | null;
};

export function ConfirmationCard({ complaint, confirmation }: Props) {
  const state = complaint.citizenConfirmation;
  const tooFar =
    !!confirmation && confirmation.distanceFromOriginalM > CONFIRMATION_MAX_DISTANCE_M;

  return (
    <div className="space-y-4">
      <Badge tone={TONES[state]}>{CITIZEN_CONFIRMATION_LABELS[state]}</Badge>

      {state === 'not_requested' && !confirmation && (
        <p className="text-sm text-slate-500">
          When an admin marks this as fixed, the citizen is asked to confirm in the app..
        </p>
      )}

      {state === 'pending' && complaint.confirmationDueAt && (
        <p className="flex gap-2 text-sm text-slate-600">
          <Clock className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden />
          The citizen has until {formatDate(complaint.confirmationDueAt)} to reply. Without a reply it can be closed as "no response".
        </p>
      )}

      {confirmation && (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Citizen response</dt>
            <dd className="font-medium text-slate-900">
              {CONFIRMATION_RESPONSE_LABELS[confirmation.response]}
            </dd>
          </div>

          {confirmation.rating && (
            <div>
              <dt className="text-xs text-slate-400">Rating</dt>
              <dd className="flex gap-0.5" aria-label={`${confirmation.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      i < confirmation.rating!
                        ? 'size-4 fill-amber-400 text-amber-400'
                        : 'size-4 text-slate-300'
                    }
                    aria-hidden
                  />
                ))}
              </dd>
            </div>
          )}

          {confirmation.comment && (
            <div>
              <dt className="text-xs text-slate-400">Comment</dt>
              <dd className="text-slate-700">"{confirmation.comment}"</dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-slate-400">Location given by citizen</dt>
            <dd className="text-slate-700">
              {confirmation.location.settlement.name} (
              {SETTLEMENT_TYPE_LABELS[confirmation.location.settlement.type]}),{' '}
              {formatUnionCouncil(confirmation.location.unionCouncil)}, {confirmation.location.tehsil},{' '}
              {confirmation.location.district}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-400">Photo distance from complaint</dt>
            <dd className={tooFar ? 'font-medium text-red-600' : 'text-slate-700'}>
              {confirmation.distanceFromOriginalM} m
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-400">Live photos</dt>
            <dd className="text-slate-700">{confirmation.evidenceIds.length} attached</dd>
          </div>

          <p className="text-xs text-slate-400">{formatDateTime(confirmation.createdAt)}</p>
        </dl>
      )}

      {(confirmation?.locationMismatch || tooFar) && (
        <div role="alert" className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
                       {confirmation?.locationMismatch && "The UC, tehsil or village given by the citizen does not match the complaint. "}
            {tooFar && `The photo was taken more than ${CONFIRMATION_MAX_DISTANCE_M} m from the complaint location. `}
            Please check manually.
          </span>
        </div>
      )}
    </div>
  );
}