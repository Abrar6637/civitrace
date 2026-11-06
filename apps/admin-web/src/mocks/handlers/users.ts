import { http, HttpResponse, delay } from 'msw';
import {
  ADMIN_ROLES,
  PUNJAB_DISTRICTS,
  adminCreateInputSchema,
  adminUpdateInputSchema,
  suspendInputSchema,
} from '@civitrace/shared';
import type { FieldChange, Paginated, User, UserSummary } from '@civitrace/shared';
import { mockUsers, type MockUserRecord } from '../data/users';
import { mockComplaints } from '../data/complaints';
import { recordAudit } from '../data/audit';
import { getSessionUser } from './auth';

const ROLE_LABELS: Record<User['role'], string> = {
  citizen: 'Citizen',
  area_admin: 'Area Admin',
  super_admin: 'Super Admin',
};

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

// Only super admins may manage users
function requireSuperAdmin(): { user: User } | { error: Response } {
  const user = getSessionUser();
  if (!user) return { error: errorResponse(401, 'NO_SESSION', 'Please sign in.') };
  if (user.role !== 'super_admin') {
    return { error: errorResponse(403, 'FORBIDDEN', 'Only a super admin can manage users.') };
  }
  return { user };
}

function summarize(r: MockUserRecord): UserSummary {
  return {
    ...r.user,
    lastLoginAt: r.lastLoginAt,
    mustChangePassword: r.mustChangePassword,
    complaintCount: mockComplaints.filter((c) => c.reporterId === r.user.id).length,
  };
}

// 12 characters without look-alike letters (0/O, 1/l)
function temporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#%';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
}

const isLastActiveSuperAdmin = (r: MockUserRecord) =>
  r.user.role === 'super_admin' &&
  r.user.status === 'active' &&
  mockUsers.filter((x) => x.user.role === 'super_admin' && x.user.status === 'active').length === 1;

const unknownDistricts = (districts: string[]) =>
  districts.filter((d) => !(PUNJAB_DISTRICTS as readonly string[]).includes(d));

export const userHandlers = [
  // List
  http.get('/api/v1/users', async ({ request }) => {
    await delay(300);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const params = new URL(request.url).searchParams;
    const group = params.get('group') === 'citizens' ? 'citizens' : 'admins';
    const q = params.get('q')?.trim().toLowerCase();
    const status = params.get('status');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

    let rows = mockUsers.filter((r) =>
      group === 'admins' ? ADMIN_ROLES.includes(r.user.role) : r.user.role === 'citizen'
    );
    if (status) rows = rows.filter((r) => r.user.status === status);
    if (q) {
      rows = rows.filter((r) =>
        [r.user.name, r.user.displayName ?? '', r.user.email ?? '', r.user.phone ?? '']
          .some((f) => f.toLowerCase().includes(q))
      );
    }

    const sorted = [...rows].sort((a, b) => a.user.name.localeCompare(b.user.name)).map(summarize);
    const body: Paginated<UserSummary> = {
      data: sorted.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: sorted.length,
    };
    return HttpResponse.json(body);
  }),

  // Create admin
  http.post('/api/v1/users', async ({ request }) => {
    await delay(500);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const parsed = adminCreateInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;
    const email = input.email.trim().toLowerCase();

    if (mockUsers.some((r) => r.user.email?.toLowerCase() === email)) {
      return errorResponse(409, 'EMAIL_TAKEN', 'A user with this email already exists.');
    }
    if (unknownDistricts(input.assignedDistricts).length > 0) {
      return errorResponse(400, 'BAD_DISTRICT', 'One or more districts are not valid.');
    }

    const password = temporaryPassword();
    const record: MockUserRecord = {
      password,
      mustChangePassword: true,
      user: {
        id: `u_${Date.now()}`,
        name: input.name,
        email,
        phone: input.phone,
        role: input.role,
        locale: 'en',
        status: 'active',
        assignedDistricts: input.role === 'area_admin' ? input.assignedDistricts : undefined,
        createdAt: new Date().toISOString(),
      },
    };
    mockUsers.push(record);

    recordAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'user.created',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: `Created ${ROLE_LABELS[input.role]} account for ${email}`,
    });

    return HttpResponse.json({ user: summarize(record), temporaryPassword: password }, { status: 201 });
  }),

  // Edit admin
  http.patch('/api/v1/users/:id', async ({ params, request }) => {
    await delay(500);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const record = mockUsers.find((r) => r.user.id === params.id);
    if (!record) return errorResponse(404, 'NOT_FOUND', 'User not found.');
    if (record.user.role === 'citizen') {
      return errorResponse(400, 'CITIZEN', 'Citizen accounts cannot be edited here.');
    }

    const parsed = adminUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;
    const isSelf = record.user.id === auth.user.id;

    if (input.role !== record.user.role) {
      if (isSelf) return errorResponse(400, 'SELF_ROLE', 'You cannot change your own role.');
      if (isLastActiveSuperAdmin(record)) {
        return errorResponse(409, 'LAST_SUPER_ADMIN', 'There must always be at least one active super admin.');
      }
    }
    if (unknownDistricts(input.assignedDistricts).length > 0) {
      return errorResponse(400, 'BAD_DISTRICT', 'One or more districts are not valid.');
    }

    const nextDistricts = input.role === 'area_admin' ? input.assignedDistricts : undefined;
    const show = (v?: string | string[]) => (Array.isArray(v) ? v.join(', ') : v) || 'Not set';

    const candidates: FieldChange[] = [
      { field: 'Name', before: record.user.name, after: input.name },
      { field: 'Phone', before: show(record.user.phone), after: show(input.phone) },
      { field: 'Role', before: ROLE_LABELS[record.user.role], after: ROLE_LABELS[input.role] },
      { field: 'Districts', before: show(record.user.assignedDistricts), after: show(nextDistricts) },
    ];
    const changes = candidates.filter((c) => c.before !== c.after);
    if (changes.length === 0) return errorResponse(400, 'NO_CHANGES', 'Nothing was changed.');

    Object.assign(record.user, {
      name: input.name,
      phone: input.phone,
      role: input.role,
      assignedDistricts: nextDistricts,
    });

    recordAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'user.updated',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: `Updated ${changes.map((c) => c.field.toLowerCase()).join(', ')}`,
      changes,
    });

    return HttpResponse.json({ user: summarize(record) });
  }),

  // Suspend
  http.post('/api/v1/users/:id/suspend', async ({ params, request }) => {
    await delay(400);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const record = mockUsers.find((r) => r.user.id === params.id);
    if (!record) return errorResponse(404, 'NOT_FOUND', 'User not found.');
    if (record.user.id === auth.user.id) {
      return errorResponse(400, 'SELF', 'You cannot suspend your own account.');
    }
    if (record.user.status === 'suspended') {
      return errorResponse(409, 'ALREADY', 'This account is already suspended.');
    }
    if (isLastActiveSuperAdmin(record)) {
      return errorResponse(409, 'LAST_SUPER_ADMIN', 'There must always be at least one active super admin.');
    }

    const parsed = suspendInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    record.user.status = 'suspended';
    recordAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'user.suspended',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: `Suspended: ${parsed.data.reason}`,
    });

    return HttpResponse.json({ user: summarize(record) });
  }),

  // Reactivate
  http.post('/api/v1/users/:id/reactivate', async ({ params }) => {
    await delay(400);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const record = mockUsers.find((r) => r.user.id === params.id);
    if (!record) return errorResponse(404, 'NOT_FOUND', 'User not found.');
    if (record.user.status === 'active') return errorResponse(409, 'ALREADY', 'This account is already active.');

    record.user.status = 'active';
    recordAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'user.reactivated',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: 'Reactivated the account',
    });

    return HttpResponse.json({ user: summarize(record) });
  }),

  // Reset password (admins only; citizens sign in with phone OTP)
  http.post('/api/v1/users/:id/reset-password', async ({ params }) => {
    await delay(400);
    const auth = requireSuperAdmin();
    if ('error' in auth) return auth.error;

    const record = mockUsers.find((r) => r.user.id === params.id);
    if (!record) return errorResponse(404, 'NOT_FOUND', 'User not found.');
    if (record.user.role === 'citizen') {
      return errorResponse(400, 'CITIZEN', 'Citizens sign in with their phone. There is no password to reset.');
    }

    const password = temporaryPassword();
    record.password = password;
    record.mustChangePassword = true;

    recordAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: 'Issued a new temporary password',
    });

    return HttpResponse.json({ temporaryPassword: password });
  }),
];