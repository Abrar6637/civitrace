import { http, HttpResponse, delay } from 'msw';
import type { AuditListResponse } from '@civitrace/shared';
import { mockAudit } from '../data/audit';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

export const auditHandlers = [
  // Read only. There is deliberately no update or delete endpoint.
  http.get('/api/v1/audit', async ({ request }) => {
    await delay(300);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    if (user.role !== 'super_admin') {
      return errorResponse(403, 'FORBIDDEN', 'Only a super admin can view the audit log.');
    }

    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const entityType = params.get('entityType');
    const actorId = params.get('actorId');
    const from = params.get('from');
    const to = params.get('to');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(1000, Math.max(1, Number(params.get('pageSize')) || 25));

    let rows = [...mockAudit].reverse(); // newest first
    if (entityType) rows = rows.filter((e) => e.entityType === entityType);
    if (actorId) rows = rows.filter((e) => e.actorId === actorId);
    if (from) rows = rows.filter((e) => e.at.slice(0, 10) >= from);
    if (to) rows = rows.filter((e) => e.at.slice(0, 10) <= to);
    if (q) {
      rows = rows.filter((e) =>
        [e.entityLabel, e.summary, e.actorName, e.action].some((f) => f.toLowerCase().includes(q))
      );
    }

    const actors = [...new Map(mockAudit.map((e) => [e.actorId, { id: e.actorId, name: e.actorName }])).values()].sort(
      (a, b) => a.name.localeCompare(b.name)
    );

    const body: AuditListResponse = {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: rows.length,
      actors,
    };
    return HttpResponse.json(body);
  }),
];