import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
  milestoneInputSchema,
  type Milestone,
  type MilestoneInput,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const toOptional = (v: unknown) => (v === '' ? undefined : v);

type Props = {
  projectId: string;
  milestone?: Milestone; // editing when given
  onDone: () => void;
  onCancel: () => void;
};

export function MilestoneForm({ projectId, milestone, onDone, onCancel }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MilestoneInput>({
    resolver: zodResolver(milestoneInputSchema),
    defaultValues: milestone
      ? {
          title: milestone.title,
          status: milestone.status,
          plannedAt: milestone.plannedAt,
          actualAt: milestone.actualAt,
          note: milestone.note,
        }
      : { title: '', status: 'pending' },
  });

  const mutation = useMutation({
    mutationFn: (input: MilestoneInput) =>
      milestone
        ? projectsService.updateMilestone(projectId, milestone.id, input)
        : projectsService.addMilestone(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onDone();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 p-4"
    >
      <p className="text-sm font-medium text-slate-900">{milestone ? 'Edit milestone' : 'Add milestone'}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="ms-title" error={errors.title?.message}>
          <Input id="ms-title" placeholder="e.g. Base course completed" invalid={!!errors.title} {...register('title')} />
        </FormField>
        <FormField label="Status" htmlFor="ms-status" error={errors.status?.message}>
          <Select id="ms-status" {...register('status')}>
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Planned date" htmlFor="ms-planned" error={errors.plannedAt?.message}>
          <Input id="ms-planned" type="date" {...register('plannedAt', { setValueAs: toOptional })} />
        </FormField>
        <FormField label="Actual date (when done)" htmlFor="ms-actual" error={errors.actualAt?.message}>
          <Input
            id="ms-actual"
            type="date"
            invalid={!!errors.actualAt}
            {...register('actualAt', { setValueAs: toOptional })}
          />
        </FormField>
      </div>

      <FormField label="Note" htmlFor="ms-note" error={errors.note?.message}>
        <Input id="ms-note" placeholder="Optional" {...register('note', { setValueAs: toText })} />
      </FormField>

      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          {milestone ? 'Save changes' : 'Add milestone'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}