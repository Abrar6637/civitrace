import { http, HttpResponse, delay } from 'msw';
import {
  ADMIN_ROLES,
  CONFIRMATION_MAX_DISTANCE_M,
  assignInputSchema,
  budgetVerifyInputSchema,
  flagReviewInputSchema,
} from '@civitrace/shared';
import type { Complaint, ProjectRef, ResolutionConfirmation, User, VerificationQueue } from '@civitrace/shared';
import { mockConfirmations } from '../data/events';
import { mockBudgets, mockDocuments, mockProjects } from '../data/projects';
import { mockFiles } from '../data/files';
import { mockUsers } from '../data/users';
import { getSessionUser } from './auth';
import { addEvent, visibleComplaints } from './complaints';
import { addVersion } from './project-records';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const isFlagged = (r: ResolutionConfirmation) =>
  (r.locationMismatch || r.distanceFromOriginalM > CONFIRMATION_MAX_DISTANCE_M) && !r.flagReviewedAt;

function visibleProjects(user: User) {
  if (user.role === 'area_admin') {
    const districts = user.assignedDistricts ?? [];
    return mockProjects.filter((p) => districts.includes(p.location.district));
  }
  return mockProjects;
}

const projectRef = (id: string): ProjectRef => {
  const p = mockProjects.find((x) => x.id === id)!;
  return { id: p.id, projectCode: p.projectCode, title: p.title };
};

// Can this admin work on complaints in this district?
const coversDistrict = (admin: User, district: string) =>
  admin.role === 'super_admin' || (admin.assignedDistricts ?? []).includes(district);

export const verificationHandlers = [
  // Everything waiting for an admin decision
  http.get('/api/v1/verification', async ({ request }) => {
    await delay(400);
    const user = getSessionUser();
    const complaints = visibleComplaints();
    if (!user || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const assigned = new URL(request.url).searchParams.get('assigned') ?? 'all';
    const now = new Date().toISOString();

    // 1. New complaints: hazards first, then oldest
    const pending = complaints
      .filter((c) => c.status === 'submitted' || c.status === 'under_review')
      .sort((a, b) => Number(b.isHazard) - Number(a.isHazard) || a.createdAt.localeCompare(b.createdAt));
    const pendingShown = pending.filter((c) =>
      assigned === 'me' ? c.assignedVerifierId === user.id : assigned === 'unassigned' ? !c.assignedVerifierId : true
    );

    // 2. Flagged citizen confirmations
    const byId = new Map(complaints.map((c) => [c.id, c]));
    const confirmations = mockConfirmations
      .filter((r) => byId.has(r.complaintId) && isFlagged(r))
      .map((r) => ({ confirmation: r, complaint: byId.get(r.complaintId)! }));

    // 3 and 4. Documents and budget rows waiting for verification
    const projectIds = new Set(visibleProjects(user).map((p) => p.id));
    const documents = mockDocuments
      .filter((d) => projectIds.has(d.projectId) && d.fileId && !d.verifiedAt)
      .map((d) => ({
        document: { ...d, file: mockFiles.find((f) => f.id === d.fileId) },
        project: projectRef(d.projectId),
      }));
    const budgets = mockBudgets
      .filter((b) => projectIds.has(b.projectId) && b.verification === 'under_review')
      .map((b) => ({
        budget: b,
        project: projectRef(b.projectId),
        verifiedDocuments: mockDocuments.filter((d) => d.projectId === b.projectId && d.verifiedAt),
      }));

    // 5. Citizen did not reply in time
    const overdue = complaints
      .filter((c) => c.status === 'awaiting_confirmation' && c.confirmationDueAt && c.confirmationDueAt < now)
      .sort((a, b) => (a.confirmationDueAt ?? '').localeCompare(b.confirmationDueAt ?? ''));

    const body: VerificationQueue = {
      counts: {
        complaints: pending.length,
        confirmations: confirmations.length,
        documents: documents.length,
        budgets: budgets.length,
        overdue: overdue.length,
      },
      complaints: pendingShown,
      confirmations,
      documents,
      budgets,
      overdue,
      verifierNames: Object.fromEntries(
        mockUsers.filter((r) => ADMIN_ROLES.includes(r.user.role)).map((r) => [r.user.id, r.user.name])
      ),
    };
    return HttpResponse.json(body);
  }),

  // Assign / unassign a complaint
  http.post('/api/v1/complaints/:id/assign', async ({ params, request }) => {
    await delay(300);
    const user = getSessionUser();
    const complaints = visibleComplaints();
    if (!user || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = complaints.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');

    const parsed = assignInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(400, 'VALIDATION', 'Invalid data.');
    const { verifierId } = parsed.data;

    const current = complaint.assignedVerifierId;
    const isSuper = user.role === 'super_admin';

    if (verifierId && verifierId !== user.id && !isSuper) {
      return errorResponse(403, 'FORBIDDEN', 'You can only assign complaints to yourself.');
    }
    if (current && current !== user.id && !isSuper) {
      const name = mockUsers.find((r) => r.user.id === current)?.user.name ?? 'another admin';
      return errorResponse(409, 'TAKEN', `This complaint is already assigned to ${name}.`);
    }

    let verifierName = '';
    if (verifierId) {
      const verifier = mockUsers.find((r) => r.user.id === verifierId)?.user;
      if (!verifier || verifier.status !== 'active' || !ADMIN_ROLES.includes(verifier.role)) {
        return errorResponse(400, 'BAD_VERIFIER', 'This admin cannot be assigned.');
      }
      if (!coversDistrict(verifier, complaint.location.district)) {
        return errorResponse(400, 'WRONG_DISTRICT', `${verifier.name} does not cover ${complaint.location.district}.`);
      }
      verifierName = verifier.name;
    }

    complaint.assignedVerifierId = verifierId ?? undefined;
    complaint.updatedAt = new Date().toISOString();
    addEvent(complaint, complaint.status, complaint.status, verifierId ? `Assigned to ${verifierName}.` : 'Unassigned.', user);

    return HttpResponse.json({ complaint });
  }),

  // Admin checked a flagged confirmation
  http.post('/api/v1/confirmations/:id/review', async ({ params, request }) => {
    await delay(300);
    const user = getSessionUser();
    const complaints = visibleComplaints();
    if (!user || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const record = mockConfirmations.find((r) => r.id === params.id);
    const complaint = record && complaints.find((c) => c.id === record.complaintId);
    if (!record || !complaint) return errorResponse(404, 'NOT_FOUND', 'Confirmation not found.');
    if (record.flagReviewedAt) return errorResponse(409, 'ALREADY', 'This confirmation was already checked.');

    const parsed = flagReviewInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    record.flagReviewedBy = user.name;
    record.flagReviewedAt = new Date().toISOString();
    record.flagReviewNote = parsed.data.note;
    addEvent(complaint, complaint.status, complaint.status, `Confirmation checked: ${parsed.data.note}`, user);

    return HttpResponse.json({ confirmation: record });
  }),

  // Budget row documented by a verified document
  http.post('/api/v1/projects/:id/budgets/:budgetId/verify', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const project = visibleProjects(user).find((p) => p.id === params.id);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const budget = mockBudgets.find((b) => b.id === params.budgetId && b.projectId === project.id);
    if (!budget) return errorResponse(404, 'NOT_FOUND', 'Budget row not found.');
    if (budget.verification !== 'under_review') {
      return errorResponse(409, 'ALREADY', 'This budget row is not waiting for verification.');
    }

    const parsed = budgetVerifyInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const document = mockDocuments.find(
      (d) => d.id === parsed.data.sourceDocumentId && d.projectId === project.id && d.verifiedAt
    );
    if (!document) return errorResponse(400, 'BAD_DOCUMENT', 'Choose a verified document from this project.');

    budget.verification = 'documented';
    budget.sourceDocumentId = document.id;
    addVersion(project.id, user, `Budget ${budget.fiscalYear} documented by ${document.title}`, [
      { field: `Budget ${budget.fiscalYear}: source`, before: 'Under review', after: `Documented (${document.title})` },
    ]);

    return HttpResponse.json({ budget });
  }),

  // Close when the citizen did not reply in time (NOT marked as resolved)
  http.post('/api/v1/complaints/:id/close-no-response', async ({ params }) => {
    await delay(400);
    const user = getSessionUser();
    const complaints = visibleComplaints();
    if (!user || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = complaints.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');
    if (complaint.status !== 'awaiting_confirmation') {
      return errorResponse(409, 'NOT_AWAITING', 'This complaint is not waiting for a citizen reply.');
    }
    if (!complaint.confirmationDueAt || complaint.confirmationDueAt > new Date().toISOString()) {
      return errorResponse(409, 'NOT_DUE', 'The citizen still has time to reply.');
    }

    complaint.status = 'closed';
    complaint.citizenConfirmation = 'no_response';
    complaint.verification = 'officially_acknowledged'; // department says fixed, citizen did not confirm
    complaint.updatedAt = new Date().toISOString();
    addEvent(
      complaint,
      'awaiting_confirmation',
      'closed',
      'Closed: the citizen did not reply in time. This is not marked as resolved.',
      user
    );

    return HttpResponse.json({ complaint });
  }),
];