import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { AlertCircle, Eye, EyeOff, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { loginInputSchema, type LoginInput } from '@civitrace/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

const highlights = [
  { icon: ShieldCheck, title: 'Verified reports', text: 'Every complaint reviewed before it goes public.' },
  { icon: MapPin, title: 'Permanent asset history', text: 'Each road and repair stays on the record.' },
  { icon: Wallet, title: 'Budget transparency', text: 'Approved, released and spent, with sources.' },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
    const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  async function onSubmit(values: LoginInput) {
        try {
      const { user, mustChangePassword } = await authService.login(values);
      setUser(user);
      setMustChangePassword(mustChangePassword);
      navigate(mustChangePassword ? '/settings' : from, { replace: true });
    } catch (err) {
            const message =
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setError('root', { message });
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel (sirf bari screen par) */}
      <aside className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-500 text-lg font-bold">
            C
          </div>
          <span className="text-xl font-semibold tracking-tight">Civitrace</span>
        </div>

        <div className="max-w-md space-y-8">
          <h1 className="text-4xl font-semibold leading-tight">
            Every public work,
            <br />
            on the record.
          </h1>
          <ul className="space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-200" aria-hidden />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-brand-100/80">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-brand-100/60">Admin & verifier console</p>
      </aside>

      {/* Right: login form */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="grid size-8 place-items-center rounded-lg bg-brand-600 font-bold text-white">
                C
              </div>
              <span className="font-semibold">Civitrace</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500">Use your admin account to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@civitrace.app"
                invalid={!!errors.email}
                {...register('email')}
              />
            </FormField>

            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  invalid={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>

            {errors.root && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{errors.root.message}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Access is limited to authorized Civitrace staff.
          </p>
        </div>
      </main>
    </div>
  );
}