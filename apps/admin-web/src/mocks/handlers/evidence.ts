import { http, HttpResponse, delay } from 'msw';
import { ADMIN_ROLES, evidenceReviewInputSchema } from '@civitrace/shared';
import { evidenceFor } from '../data/evidence';
import { recordAudit } from '../data/audit';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const KIND_LABEL = { photo: 'photo', video: 'video', voice: 'voice note' } as const;

export const evidenceHandlers = [
  http.get('/api/v1/complaints/:id/evidence', async ({ params }) => {
    await delay(300);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    if (!ADMIN_ROLES.includes(user.role)) return errorResponse(403, 'FORBIDDEN', 'Admins only.');
    return HttpResponse.json({ items: evidenceFor(String(params.id)) });
  }),

  http.post('/api/v1/complaints/:id/evidence/:evidenceId/review', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    if (!ADMIN_ROLES.includes(user.role)) return errorResponse(403, 'FORBIDDEN', 'Admins only.');

    const parsed = evidenceReviewInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input.');
    }

    const complaintId = String(params.id);
    const item = evidenceFor(complaintId).find((e) => e.id === params.evidenceId);
    if (!item) return errorResponse(404, 'NOT_FOUND', 'Evidence not found.');

    const input = parsed.data;
    // A citizen's voice is personal data: it is never published
    if (item.kind === 'voice' && input.decision === 'public') {
      return errorResponse(400, 'VOICE_PRIVATE', 'Voice notes are never made public.');
    }

    const before = item.reviewState;
    item.reviewState = input.decision;
    item.reviewedById = user.id;
    item.reviewedByName = user.name;
    item.reviewedAt = new Date().toISOString();
    item.hideReason = input.decision === 'hidden' ? input.reason : undefined;

    recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: input.decision === 'public' ? 'evidence.published' : 'evidence.hidden',
      entityType: 'complaint',
      entityId: complaintId,
      entityLabel: complaintId,
      summary:
        input.decision === 'public'
          ? `Made a ${KIND_LABEL[item.kind]} public after privacy checks (was ${before})`
          : `Hid a ${KIND_LABEL[item.kind]}: ${input.reason}`,
    });

    return HttpResponse.json({ item });
  }),
];