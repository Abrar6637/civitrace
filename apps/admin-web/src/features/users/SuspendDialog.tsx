import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { suspendInputSchema, type SuspendInput, type UserSummary } from '@civitrace/shared';
import { usersService } from '@/services/users.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  user: UserSummary | null;
  onClose: () => void;
};

export function SuspendDialog({ user, onClose }: Props) {
  return (
    <Dialog
      open={!!user}
      title={user ? `Suspend ${user.name}?` : 'Suspend'}
      description="They will not be able to sign in until the account is reactivated."
      onClose={onClose}
    >
      {user && <SuspendForm key={user.id} user={user} onClose={onClose} />}
    </Dialog>
  );
}

function SuspendForm({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuspendInput>({ resolver: zodResolver(suspendInputSchema) });

  const mutation = useMutation({
    mutationFn: (input: SuspendInput) => usersService.suspend(user.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <FormField label="Reason (saved in the audit log)" htmlFor="s-reason" error={errors.reason?.message}>
        <Textarea
          id="s-reason"
          rows={3}
          autoFocus
          placeholder="e.g. Left the organisation on 1 Nov 2026"
          invalid={!!errors.reason}
          {...register('reason')}
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
        <Button type="submit" variant="danger" loading={mutation.isPending}>
          Suspend account
        </Button>
      </div>
    </form>
  );
}