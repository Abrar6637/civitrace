import { http, HttpResponse, delay } from 'msw';
import { ADMIN_ROLES, passwordChangeInputSchema, profileUpdateInputSchema } from '@civitrace/shared';
import type { FieldChange } from '@civitrace/shared';
import { mockUsers } from '../data/users';
import { recordAudit } from '../data/audit';

// The real backend keeps the session in an HttpOnly cookie the browser code cannot read.
// The mock keeps it in localStorage on the "server" side; app code never touches it.
const SESSION_KEY = 'civitrace-mock-session';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function sessionRecord() {
  const userId = localStorage.getItem(SESSION_KEY);
  return mockUsers.find((r) => r.user.id === userId) ?? null;
}

// Other handlers use this to know who is signed in
export function getSessionUser() {
  return sessionRecord()?.user ?? null;
}

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { email?: string; password?: string };

    const record = mockUsers.find((r) => r.user.email === body.email?.trim().toLowerCase());

    if (!record || record.password !== body.password) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }
    if (!ADMIN_ROLES.includes(record.user.role)) {
      return errorResponse(403, 'NOT_ADMIN', 'This panel is for admins only.');
    }
    if (record.user.status !== 'active') {
      return errorResponse(403, 'SUSPENDED', 'This account is suspended.');
    }

    record.lastLoginAt = new Date().toISOString();
    localStorage.setItem(SESSION_KEY, record.user.id);
    return HttpResponse.json({ user: record.user, mustChangePassword: record.mustChangePassword });
  }),

  http.get('/api/v1/auth/me', async () => {
    await delay(300);
    const record = sessionRecord();
    if (!record) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    if (record.user.status !== 'active') {
      localStorage.removeItem(SESSION_KEY);
      return errorResponse(403, 'SUSPENDED', 'This account is suspended.');
    }
    return HttpResponse.json({ user: record.user, mustChangePassword: record.mustChangePassword });
  }),

  // Update own profile
  http.patch('/api/v1/auth/me', async ({ request }) => {
    await delay(400);
    const record = sessionRecord();
    if (!record) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const parsed = profileUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;

    const changes: FieldChange[] = [
      { field: 'Name', before: record.user.name, after: input.name },
      { field: 'Phone', before: record.user.phone ?? 'Not set', after: input.phone ?? 'Not set' },
      { field: 'Language', before: record.user.locale, after: input.locale },
    ].filter((c) => c.before !== c.after);

    if (changes.length === 0) return errorResponse(400, 'NO_CHANGES', 'Nothing was changed.');

    Object.assign(record.user, { name: input.name, phone: input.phone, locale: input.locale });
    recordAudit({
      actorId: record.user.id,
      actorName: record.user.name,
      action: 'user.profile_updated',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: 'Updated own profile',
      changes,
    });

    return HttpResponse.json({ user: record.user, mustChangePassword: record.mustChangePassword });
  }),

  // Change own password
  http.post('/api/v1/auth/change-password', async ({ request }) => {
    await delay(500);
    const record = sessionRecord();
    if (!record) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const parsed = passwordChangeInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    if (parsed.data.currentPassword !== record.password) {
      return errorResponse(400, 'WRONG_PASSWORD', 'Your current password is not correct.');
    }

    record.password = parsed.data.newPassword;
    record.mustChangePassword = false;
    recordAudit({
      actorId: record.user.id,
      actorName: record.user.name,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: record.user.id,
      entityLabel: record.user.name,
      summary: 'Changed own password',
    });

    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/v1/auth/logout', async () => {
    await delay(200);
    localStorage.removeItem(SESSION_KEY);
    return HttpResponse.json({ ok: true });
  }),
];