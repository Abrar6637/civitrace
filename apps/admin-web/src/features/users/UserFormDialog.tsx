import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  adminCreateInputSchema,
  adminUpdateInputSchema,
  type AdminCreateInput,
  type UserSummary,
} from '@civitrace/shared';
import { usersService } from '@/services/users.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DistrictMultiSelect } from './DistrictMultiSelect';

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

type Props = {
  open: boolean;
  user?: UserSummary; // editing when given
  onClose: () => void;
  onCreated: (user: UserSummary, temporaryPassword: string) => void;
};

export function UserFormDialog({ open, user, onClose, onCreated }: Props) {
  return (
    <Dialog
      open={open}
      title={user ? `Edit ${user.name}` : 'New admin'}
      description={user ? user.email : 'A temporary password will be created for the first sign-in.'}
      onClose={onClose}
    >
      {open && <UserForm key={user?.id ?? 'new'} user={user} onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}

function UserForm({ user, onClose, onCreated }: Omit<Props, 'open'>) {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isEdit = !!user;
  const isSelf = !!user && user.id === me?.id;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
   } = useForm<AdminCreateInput>({
    // The edit schema has no email field; the cast keeps one form for both cases
    resolver: (isEdit
      ? zodResolver(adminUpdateInputSchema)
      : zodResolver(adminCreateInputSchema)) as unknown as Resolver<AdminCreateInput>,
    defaultValues: user
      ? {
          name: user.name,
          email: user.email ?? '',
          phone: user.phone,
          role: user.role === 'super_admin' ? 'super_admin' : 'area_admin',
          assignedDistricts: user.assignedDistricts ?? [],
        }
      : { name: '', email: '', role: 'area_admin', assignedDistricts: [] },
  });

  const role = useWatch({ control, name: 'role' });

  const mutation = useMutation({
    mutationFn: async (v: AdminCreateInput): Promise<{ user: UserSummary; temporaryPassword?: string }> => {
      const assignedDistricts = v.role === 'area_admin' ? v.assignedDistricts : [];
      if (user) {
        return usersService.update(user.id, { name: v.name, phone: v.phone, role: v.role, assignedDistricts });
      }
      return usersService.create({ ...v, assignedDistricts });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (res.temporaryPassword) onCreated(res.user, res.temporaryPassword);
      else onClose();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <FormField label="Full name" htmlFor="u-name" error={errors.name?.message}>
        <Input id="u-name" autoFocus invalid={!!errors.name} {...register('name')} />
      </FormField>

      {!isEdit && (
        <FormField label="Email (used to sign in)" htmlFor="u-email" error={errors.email?.message}>
          <Input id="u-email" type="email" autoComplete="off" invalid={!!errors.email} {...register('email')} />
        </FormField>
      )}

      <FormField label="Mobile number" htmlFor="u-phone" error={errors.phone?.message}>
        <Input
          id="u-phone"
          type="tel"
          inputMode="tel"
          placeholder="Optional, e.g. 03001234567"
          invalid={!!errors.phone}
          {...register('phone', { setValueAs: toText })}
        />
      </FormField>

      <FormField label="Role" htmlFor="u-role" error={errors.role?.message}>
        {isSelf ? (
          <p className="text-sm text-slate-700">
            {ROLE_LABELS[user.role]} <span className="text-xs text-slate-400">(you cannot change your own role)</span>
          </p>
        ) : (
          <Select id="u-role" {...register('role')}>
            <option value="area_admin">Area Admin: works in assigned districts</option>
            <option value="super_admin">Super Admin: full access</option>
          </Select>
        )}
      </FormField>

      {role === 'area_admin' && (
        <FormField label="Districts" htmlFor="u-districts">
          <Controller
            name="assignedDistricts"
            control={control}
            render={({ field, fieldState }) => (
              <DistrictMultiSelect value={field.value ?? []} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
        </FormField>
      )}

      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? 'Save changes' : 'Create admin'}
        </Button>
      </div>
    </form>
  );
}