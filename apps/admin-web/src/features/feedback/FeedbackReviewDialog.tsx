import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { feedbackReviewInputSchema, type FeedbackItem, type FeedbackReviewInput } from '@civitrace/shared';
import { feedbackService } from '@/services/feedback.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';

export type ReviewTarget = { item: FeedbackItem; decision: 'accepted' | 'rejected' };

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function FeedbackReviewDialog({ target, onClose }: { target: ReviewTarget | null; onClose: () => void }) {
  const accepting = target?.decision === 'accepted';
  return (
    <Dialog
      open={!!target}
      title={accepting ? 'Accept this feedback?' : 'Do not accept this feedback?'}
      description={
        accepting
          ? 'It will be counted in the condition summary as a citizen observation.'
          : 'It will not be counted. The citizen keeps their record.'
      }
      onClose={onClose}
    >
      {target && <ReviewForm key={`${target.item.id}-${target.decision}`} target={target} onClose={onClose} />}
    </Dialog>
  );
}

function ReviewForm({ target, onClose }: { target: ReviewTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const accepting = target.decision === 'accepted';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackReviewInput>({
    resolver: zodResolver(feedbackReviewInputSchema),
    defaultValues: { decision: target.decision },
  });

  const mutation = useMutation({
    mutationFn: (input: FeedbackReviewInput) => feedbackService.review(target.item.id, input),
    onSuccess: () => {
      for (const key of ['feedback', 'project', 'audit']) queryClient.invalidateQueries({ queryKey: [key] });
      onClose();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <FormField
        label={accepting ? 'Note (optional)' : 'Reason'}
        htmlFor="fb-note"
        error={errors.note?.message}
      >
        <Textarea
          id="fb-note"
          rows={3}
          autoFocus
          placeholder={accepting ? 'Optional' : 'e.g. The photo shows a different road.'}
          invalid={!!errors.note}
          {...register('note', { setValueAs: toText })}
        />
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
        <Button type="submit" variant={accepting ? 'primary' : 'danger'} loading={mutation.isPending}>
          {accepting ? 'Accept' : 'Do not accept'}
        </Button>
      </div>
    </form>
  );
}