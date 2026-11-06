import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  passwordChangeInputSchema,
  profileUpdateInputSchema,
  type PasswordChangeInput,
  type ProfileUpdateInput,
  type User,
} from '@civitrace/shared';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailField } from '@/components/ui/detail-field';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

const errorText = (err: unknown) =>
  err instanceof ApiError ? err.message : err ? 'Something went wrong. Please try again.' : null;

function Feedback({ error, success }: { error: unknown; success: string | null }) {
  const text = errorText(error);
  if (text) {
    return (
      <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {text}
      </div>
    );
  }
  if (success) {
    return (
      <div role="status" className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        {success}
      </div>
    );
  }
  return null;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Your profile, language and password.</p>
      </div>

      {mustChangePassword && (
        <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong className="font-medium">Set a new password to continue.</strong> You signed in with a temporary
            password. Other pages will open after you change it.
          </p>
        </div>
      )}

      <Card title="Account">
        <dl className="grid gap-4 sm:grid-cols-3">
          <DetailField label="Email">{user.email}</DetailField>
          <DetailField label="Role">{ROLE_LABELS[user.role]}</DetailField>
          <DetailField label="Districts">
            {user.role === 'super_admin' ? 'All districts' : user.assignedDistricts?.join(', ') || 'None'}
          </DetailField>
        </dl>
        <p className="mt-4 text-xs text-slate-400">Only a super admin can change your email, role or districts.</p>
      </Card>

      <PasswordCard />
      {!mustChangePassword && <ProfileCard user={user} />}
    </div>
  );
}

function ProfileCard({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [saved, setSaved] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateInputSchema),
    defaultValues: { name: user.name, phone: user.phone, locale: user.locale },
  });

  const mutation = useMutation({
    mutationFn: (input: ProfileUpdateInput) => authService.updateProfile(input),
    onMutate: () => setSaved(null),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      setSaved('Profile saved.');
    },
  });

  return (
    <Card title="Profile">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Mobile number" htmlFor="p-phone" error={errors.phone?.message}>
            <Input
              id="p-phone"
              type="tel"
              placeholder="Optional, e.g. 03001234567"
              invalid={!!errors.phone}
              {...register('phone', { setValueAs: toText })}
            />
          </FormField>
          {/* <FormField label="Language" htmlFor="p-locale" error={errors.locale?.message}>
            <Select id="p-locale" {...register('locale')}>
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
            </Select>
          </FormField> */}
        </div>
        <Feedback error={mutation.error} success={saved} />
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const [saved, setSaved] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeInputSchema) });

  const mutation = useMutation({
    mutationFn: (input: PasswordChangeInput) => authService.changePassword(input),
    onMutate: () => setSaved(null),
    onSuccess: () => {
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMustChangePassword(false);
      setSaved('Password changed.');
    },
  });

  return (
    <Card title="Change password">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
        <FormField label="Current password" htmlFor="pw-current" error={errors.currentPassword?.message}>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            {...register('currentPassword')}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="New password" htmlFor="pw-new" error={errors.newPassword?.message}>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="pw-confirm" error={errors.confirmPassword?.message}>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </FormField>
        </div>
        <p className="text-xs text-slate-500">
          At least 10 characters, with an uppercase letter, a lowercase letter and a number.
        </p>
        <Feedback error={mutation.error} success={saved} />
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}