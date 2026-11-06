import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_ROLES } from '@civitrace/shared';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';

export function ProtectedRoute() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const setUser = useAuthStore((s) => s.setUser);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);

  const { data, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.me,
    enabled: !user, // skip when the user is already known
    retry: false,
  });

  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
      setMustChangePassword(data.mustChangePassword);
    }
  }, [data, setUser, setMustChangePassword]);

  if (user) {
    if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/login" replace />;
    // A temporary password must be replaced before anything else
    if (mustChangePassword && location.pathname !== '/settings') {
      return <Navigate to="/settings" replace />;
    }
    return <Outlet />;
  }

  if (isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <FullScreenLoader />;
}