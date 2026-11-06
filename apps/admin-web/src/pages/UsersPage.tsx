import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Inbox, KeyRound, LoaderCircle, Pencil, Plus, Search } from 'lucide-react';
import type { UserSummary } from '@civitrace/shared';
import { usersService } from '@/services/users.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate, formatDateTime, maskPhone } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RoleBadge, UserStatusBadge } from '@/features/users/UserBadges';
import { UserFormDialog } from '@/features/users/UserFormDialog';
import { SuspendDialog } from '@/features/users/SuspendDialog';
import { TemporaryPasswordDialog } from '@/features/users/TemporaryPasswordDialog';

const PAGE_SIZE = 15;
type Group = 'admins' | 'citizens';
type Issued = { name: string; email?: string; password: string };

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [group, setGroup] = useState<Group>('admins');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 400);

  const [editing, setEditing] = useState<UserSummary | 'new' | null>(null);
  const [suspending, setSuspending] = useState<UserSummary | null>(null);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  const query = { group, q, status, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['users', query],
    queryFn: () => usersService.list(query),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const reactivate = useMutation({
    mutationFn: (id: string) => usersService.reactivate(id),
    onSuccess: refresh,
  });

  const reset = useMutation({
    mutationFn: (u: UserSummary) => usersService.resetPassword(u.id),
    onSuccess: ({ temporaryPassword }, u) => {
      setResetting(null);
      setIssued({ name: u.name, email: u.email, password: temporaryPassword });
      refresh();
    },
  });

  const actionError = [reactivate.error, reset.error].find(Boolean);
  const actionMessage = actionError instanceof ApiError ? actionError.message : actionError ? 'Something went wrong.' : null;

  function switchGroup(next: Group) {
    setGroup(next);
    setPage(1);
    setStatus('');
  }

  const isAdmins = group === 'admins';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Manage admin accounts and citizen access.</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
          )}
          {isAdmins && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              New admin
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
        {(['admins', 'citizens'] as const).map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={group === g}
            onClick={() => switchGroup(g)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              group === g ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {g === 'admins' ? 'Admins' : 'Citizens'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isAdmins ? 'Search name or email' : 'Search name or phone'}
            aria-label="Search users"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {actionMessage && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {actionMessage}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-slate-600">Could not load users.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">{isAdmins ? 'Role' : 'Phone'}</th>
                  <th className="px-4 py-3">{isAdmins ? 'Districts' : 'Complaints'}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">{isAdmins ? 'Last sign-in' : 'Joined'}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {data?.data.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {u.name} {isSelf && <span className="text-xs font-normal text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{isAdmins ? u.email : u.displayName}</p>
                        {u.mustChangePassword && (
                          <Badge tone="amber" className="mt-1">
                            Must change password
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmins ? <RoleBadge role={u.role} /> : <span className="tabular-nums text-slate-700">{maskPhone(u.phone)}</span>}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-700">
                        {isAdmins
                          ? u.role === 'super_admin'
                            ? 'All districts'
                            : u.assignedDistricts?.join(', ') || 'None'
                          : u.complaintCount}
                      </td>
                      <td className="px-4 py-3">
                        <UserStatusBadge status={u.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {isAdmins
                          ? u.lastLoginAt
                            ? formatDateTime(u.lastLoginAt)
                            : 'Never'
                          : formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isAdmins && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}>
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResetting(u)}
                                aria-label={`Reset password for ${u.name}`}
                                title="Reset password"
                              >
                                <KeyRound className="size-4" aria-hidden />
                              </Button>
                            </>
                          )}
                          {u.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              title={isSelf ? 'You cannot suspend your own account' : undefined}
                              onClick={() => setSuspending(u)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={reactivate.isPending && reactivate.variables === u.id}
                              onClick={() => reactivate.mutate(u.id)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data && data.data.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">No users match these filters.</p>
              </div>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </div>

      {/* Dialogs */}
      <UserFormDialog
        open={editing !== null}
        user={editing === 'new' || editing === null ? undefined : editing}
        onClose={() => setEditing(null)}
        onCreated={(u, password) => {
          setEditing(null);
          setIssued({ name: u.name, email: u.email, password });
        }}
      />

      <SuspendDialog user={suspending} onClose={() => setSuspending(null)} />

      <Dialog
        open={!!resetting}
        title={resetting ? `Reset password for ${resetting.name}?` : 'Reset password'}
        description="Their current password will stop working immediately."
        onClose={() => setResetting(null)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetting(null)}>
            Cancel
          </Button>
          <Button loading={reset.isPending} onClick={() => resetting && reset.mutate(resetting)}>
            Reset password
          </Button>
        </div>
      </Dialog>

      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </div>
  );
}