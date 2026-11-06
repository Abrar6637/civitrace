import { Link, Outlet } from 'react-router';
import { ShieldX } from 'lucide-react';
import type { UserRole } from '@civitrace/shared';
import { useAuthStore } from '@/store/auth.store';

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const role = useAuthStore((s) => s.user?.role);

  if (!role || !roles.includes(role)) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
        <ShieldX className="size-8 text-slate-300" aria-hidden />
        <p className="text-sm font-medium text-slate-900">You don't have access to this page</p>
        <p className="text-sm text-slate-500">Ask a super admin if you need access.</p>
        <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <Outlet />;
}