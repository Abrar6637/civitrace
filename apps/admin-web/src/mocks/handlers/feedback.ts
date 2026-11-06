import { http, HttpResponse, delay } from 'msw';
import { CONDITION_SCORE_LABELS, feedbackReviewInputSchema } from '@civitrace/shared';
import type { FeedbackItem, Paginated } from '@civitrace/shared';
import { mockFeedback } from '../data/feedback';
import { mockAssets } from '../data/assets';
import { mockProjects } from '../data/projects';
import { mockUsers } from '../data/users';
import { recordAudit } from '../data/audit';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

// Feedback joined with its asset and project; area admins see their districts only
function visibleFeedback(): FeedbackItem[] | null {
  const user = getSessionUser();
  if (!user) return null;
  const districts = user.role === 'area_admin' ? (user.assignedDistricts ?? []) : null;

  return mockFeedback.flatMap((f) => {
    const asset = mockAssets.find((a) => a.id === f.assetId);
    if (!asset) return [];
    if (districts && !districts.includes(asset.location.district)) return [];
    const project = mockProjects.find((p) => p.id === f.projectId);
    const reporter = mockUsers.find((r) => r.user.id === f.reporterId)?.user;
    return [
      {
        ...f,
        asset: { id: asset.id, assetCode: asset.assetCode, name: asset.name, location: asset.location },
        project: project ? { id: project.id, projectCode: project.projectCode, title: project.title } : undefined,
        reporterName: reporter?.displayName ?? 'Citizen',
      },
    ];
  });
}

export const feedbackHandlers = [
  http.get('/api/v1/feedback', async ({ request }) => {
    await delay(300);
    let rows = visibleFeedback();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    const period = params.get('period');
    const district = params.get('district');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

    if (status) rows = rows.filter((f) => f.reviewStatus === status);
    if (period) rows = rows.filter((f) => f.reviewPeriod === period);
    if (district) rows = rows.filter((f) => f.asset.location.district === district);

    rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const body: Paginated<FeedbackItem> = {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: rows.length,
    };
    return HttpResponse.json(body);
  }),

  http.post('/api/v1/feedback/:id/review', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    const rows = visibleFeedback();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const item = rows.find((f) => f.id === params.id);
    const record = mockFeedback.find((f) => f.id === params.id);
    if (!item || !record) return errorResponse(404, 'NOT_FOUND', 'Feedback not found.');
    if (record.reviewStatus !== 'pending') {
      return errorResponse(409, 'ALREADY', 'This feedback was already reviewed.');
    }

    const parsed = feedbackReviewInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const { decision, note } = parsed.data;

    record.reviewStatus = decision;
    record.reviewedBy = user.name;
    record.reviewedAt = new Date().toISOString();
    record.reviewNote = note;

    recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: decision === 'accepted' ? 'project.feedback_accepted' : 'project.feedback_rejected',
      entityType: item.project ? 'project' : 'asset',
      entityId: item.project?.id ?? item.asset.id,
      entityLabel: item.project?.projectCode ?? item.asset.assetCode,
      summary: `${decision === 'accepted' ? 'Accepted' : 'Did not accept'} condition feedback (${
        CONDITION_SCORE_LABELS[record.conditionScore]
      })${note ? `: ${note}` : ''}`,
    });

    return HttpResponse.json({ feedback: record });
  }),
];