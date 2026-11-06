import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Info } from 'lucide-react';
import {
  EVIDENCE_REQUIRED_STATUSES,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  STATUS_TRANSITIONS,
  statusChangeInputSchema,
  type Complaint,
  type ComplaintStatus,
  type StatusChangeInput,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const ACTION_LABELS: Partial<Record<ComplaintStatus, string>> = {
  under_review: 'Start review',
  published: 'Publish',
  routed: 'Route to department',
  acknowledged: 'Mark acknowledged',
  action_planned: 'Action planned',
  in_progress: 'Mark in progress',
  awaiting_confirmation: 'Mark as fixed, ask citizen',
  closed: 'Close',
  rejected: 'Reject',
};

export function StatusActionPanel({ complaint }: { complaint: Complaint }) {
  const queryClient = useQueryClient();
  const allowed = STATUS_TRANSITIONS[complaint.status];
  const [target, setTarget] = useState<ComplaintStatus | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StatusChangeInput>({ resolver: zodResolver(statusChangeInputSchema) });

  const mutation = useMutation({
    mutationFn: (input: StatusChangeInput) => complaintsService.changeStatus(complaint.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); 
      setTarget(null);
    },
  });

  function choose(status: ComplaintStatus) {
    setTarget(status);
    reset({ toStatus: status, note: '', rejectionReason: undefined });
    mutation.reset();
  }

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {complaint.status === 'awaiting_confirmation'
          ? 'Waiting for the citizen reply. An admin cannot mark this as resolved.'
          : 'No further action is possible on this complaint'}
      </p>
    );
  }

  if (!target) {
    return (
      <div className="flex flex-col gap-2">
        {allowed.map((status) => (
          <Button
            key={status}
            variant={status === 'rejected' ? 'danger' : status === allowed[0] ? 'primary' : 'secondary'}
            onClick={() => choose(status)}
            className="w-full"
          >
            {ACTION_LABELS[status] ?? status}
          </Button>
        ))}
      </div>
    );
  }

  const isReject = target === 'rejected';
  const needsEvidence = EVIDENCE_REQUIRED_STATUSES.includes(target);
  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong,' : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <p className="text-sm font-medium text-slate-900">{ACTION_LABELS[target]}</p>

      {isReject && (
        <FormField label="Reason" htmlFor="rejectionReason" error={errors.rejectionReason?.message}>
          <Select
            id="rejectionReason"
            {...register('rejectionReason', { setValueAs: (v) => v || undefined })}
          >
            <option value="">Wajah chunein</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {REJECTION_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Note" htmlFor="note" error={errors.note?.message}>
        <Textarea
          id="note"
          rows={3}
          invalid={!!errors.note}
          placeholder={
            needsEvidence ? 'Letter no., date, department name…' : 'Explain your decision'
          }
          {...register('note')}
        />
      </FormField>

      {needsEvidence && (
        <div className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Evidence is required for this step. Document/photo upload next step, Add the letter number or reference in the note.
          </span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          variant={isReject ? 'danger' : 'primary'}
          loading={mutation.isPending}
          className="flex-1"
        >
          Confirm
        </Button>
        <Button type="button" variant="secondary" onClick={() => setTarget(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}