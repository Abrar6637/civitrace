import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  statusChangeInputSchema,
  type Complaint,
  type ComplaintStatus,
  type StatusChangeInput,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQueueRefresh } from './useQueueRefresh';

export type QuickTarget = { complaint: Complaint; toStatus: ComplaintStatus };

const TITLES: Partial<Record<ComplaintStatus, string>> = {
  under_review: 'Start review',
  published: 'Publish',
  rejected: 'Reject',
};

const DEFAULT_NOTES: Partial<Record<ComplaintStatus, string>> = {
  under_review: 'Picked up for verification.',
  published: 'Photo and location checked. Published publicly.',
};

export function StatusQuickDialog({ target, onClose }: { target: QuickTarget | null; onClose: () => void }) {
  return (
    <Dialog
      open={!!target}
      title={target ? `${TITLES[target.toStatus] ?? 'Update'} ${target.complaint.complaintNo}` : ''}
      description={target?.complaint.description}
      onClose={onClose}
    >
      {target && (
        <QuickForm key={`${target.complaint.id}-${target.toStatus}`} target={target} onClose={onClose} />
      )}
    </Dialog>
  );
}

function QuickForm({ target, onClose }: { target: QuickTarget; onClose: () => void }) {
  const refresh = useQueueRefresh();
  const isReject = target.toStatus === 'rejected';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StatusChangeInput>({
    resolver: zodResolver(statusChangeInputSchema),
    defaultValues: { toStatus: target.toStatus, note: DEFAULT_NOTES[target.toStatus] ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (input: StatusChangeInput) => complaintsService.changeStatus(target.complaint.id, input),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      {isReject && (
        <FormField label="Reason" htmlFor="q-reason" error={errors.rejectionReason?.message}>
          <Select id="q-reason" {...register('rejectionReason', { setValueAs: (v) => v || undefined })}>
            <option value="">Choose a reason</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {REJECTION_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Note" htmlFor="q-note" error={errors.note?.message}>
        <Textarea id="q-note" rows={3} autoFocus invalid={!!errors.note} {...register('note')} />
      </FormField>

      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant={isReject ? 'danger' : 'primary'} loading={mutation.isPending}>
          {TITLES[target.toStatus] ?? 'Confirm'}
        </Button>
      </div>
    </form>
  );
}