import { http, HttpResponse, delay } from 'msw';
import {
  MILESTONE_STATUS_LABELS,
  PHOTO_STAGE_LABELS,
   photoInputSchema,
  PROJECT_DOCUMENT_TYPE_LABELS,
  documentInputSchema,
  milestoneInputSchema,
} from '@civitrace/shared';
import type { FieldChange, Milestone, ProjectDocument, ProjectPhoto, User } from '@civitrace/shared';
import { mockPhotos } from '../data/photos';
import { mockDocuments, mockMilestones, mockProjects } from '../data/projects';
import { recordAudit } from '../data/audit';
import { mockFiles } from '../data/files';
import { mockVersions } from '../data/versions';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const today = () => new Date().toISOString().slice(0, 10);

function findProject(id: unknown, user: User) {
  const project = mockProjects.find((p) => p.id === id);
  if (!project) return null;
  if (user.role === 'area_admin' && !(user.assignedDistricts ?? []).includes(project.location.district)) {
    return null;
  }
  return project;
}

// Every change to documents or milestones is kept in the project history
// Every change to documents, milestones or photos goes to the project history and the audit log
export function addVersion(projectId: string, user: User, reason: string, changes: FieldChange[]) {
  const now = new Date().toISOString();
  const project = mockProjects.find((p) => p.id === projectId);

  mockVersions.push({
    id: `${projectId}_v${Date.now()}`,
    projectId,
    version: mockVersions.filter((v) => v.projectId === projectId).length + 1,
    action: 'updated',
    changedBy: user.name,
    changedAt: now,
    reason,
    changes,
  });
  if (project) project.updatedAt = now;

  recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: 'project.updated',
    entityType: 'project',
    entityId: projectId,
    entityLabel: project?.projectCode ?? projectId,
    summary: reason,
    changes,
  });
}

const milestoneSnapshot = (m: Partial<Milestone>): Record<string, string | undefined> => ({
  Title: m.title,
  Status: m.status ? MILESTONE_STATUS_LABELS[m.status] : undefined,
  Planned: m.plannedAt,
  Done: m.actualAt,
  Note: m.note,
});

export const projectRecordHandlers = [
  // Add a document
  http.post('/api/v1/projects/:id/documents', async ({ params, request }) => {
    await delay(500);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    const project = findProject(params.id, user);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const parsed = documentInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;

    const file = mockFiles.find((f) => f.id === input.fileId);
    if (!file || file.kind !== 'document') {
      return errorResponse(400, 'BAD_FILE', 'The attached file was not found. Upload it again.');
    }

    const document: ProjectDocument = {
      id: `${project.id}_d${Date.now()}`,
      projectId: project.id,
      ...input,
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString(),
    };
    mockDocuments.push(document);

    const label = PROJECT_DOCUMENT_TYPE_LABELS[input.documentType];
    addVersion(project.id, user, `Document added: ${label}`, [
      { field: 'Document', after: `${input.title}${input.referenceNo ? ` (${input.referenceNo})` : ''}` },
    ]);

    return HttpResponse.json({ document }, { status: 201 });
  }),

  // Verify a document (must be a different admin than the uploader)
  http.post('/api/v1/projects/:id/documents/:docId/verify', async ({ params }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    const project = findProject(params.id, user);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const document = mockDocuments.find((d) => d.id === params.docId && d.projectId === project.id);
    if (!document) return errorResponse(404, 'NOT_FOUND', 'Document not found.');
    if (!document.fileId) return errorResponse(409, 'NO_FILE', 'Attach a file before verifying this document.');
    if (document.verifiedAt) return errorResponse(409, 'ALREADY_VERIFIED', 'This document is already verified.');
    if (document.uploadedBy === user.name) {
      return errorResponse(403, 'SAME_PERSON', 'Another admin must verify a document you uploaded.');
    }

    document.verifiedBy = user.name;
    document.verifiedAt = today();

    addVersion(project.id, user, `Document verified: ${document.title}`, [
      { field: `Document: ${document.title}`, before: 'Not verified', after: `Verified by ${user.name}` },
    ]);

    return HttpResponse.json({ document });
  }),

  // Add a milestone
  http.post('/api/v1/projects/:id/milestones', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    const project = findProject(params.id, user);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const parsed = milestoneInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const milestone: Milestone = { id: `${project.id}_m${Date.now()}`, projectId: project.id, ...parsed.data };
    mockMilestones.push(milestone);

    addVersion(project.id, user, `Milestone added: ${milestone.title}`, [
      { field: `Milestone: ${milestone.title}`, after: MILESTONE_STATUS_LABELS[milestone.status] },
    ]);

    return HttpResponse.json({ milestone }, { status: 201 });
  }),

  // Update a milestone
  http.patch('/api/v1/projects/:id/milestones/:milestoneId', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    const project = findProject(params.id, user);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const milestone = mockMilestones.find((m) => m.id === params.milestoneId && m.projectId === project.id);
    if (!milestone) return errorResponse(404, 'NOT_FOUND', 'Milestone not found.');

    const parsed = milestoneInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const before = milestoneSnapshot(milestone);
    const after = milestoneSnapshot(parsed.data);
    const changes: FieldChange[] = Object.keys(before)
      .filter((k) => before[k] !== after[k])
      .map((k) => ({ field: `Milestone ${k.toLowerCase()}`, before: before[k], after: after[k] }));

    if (changes.length === 0) return errorResponse(400, 'NO_CHANGES', 'Nothing was changed.');

    Object.assign(milestone, parsed.data);
    addVersion(project.id, user, `Milestone updated: ${milestone.title}`, changes);

    return HttpResponse.json({ milestone });
  }),
    // Add a photo (public copy must be blurred, or the admin confirms nothing sensitive is visible)
  http.post('/api/v1/projects/:id/photos', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');
    const project = findProject(params.id, user);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const parsed = photoInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;

    const file = mockFiles.find((f) => f.id === input.fileId);
    if (!file || file.kind !== 'photo') {
      return errorResponse(400, 'BAD_FILE', 'The photo was not found. Upload it again.');
    }
    if (!file.redacted && !input.noSensitiveContentConfirmed) {
      return errorResponse(
        400,
        'NOT_REDACTED',
        'Blur faces and number plates, or confirm that none are visible.'
      );
    }

    const photo: ProjectPhoto = {
      id: `${project.id}_ph${Date.now()}`,
      projectId: project.id,
      stage: input.stage,
      caption: input.caption,
      takenAt: input.takenAt,
      fileId: input.fileId,
      originalFileId: input.originalFileId,
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString(),
    };
    mockPhotos.push(photo);

    addVersion(project.id, user, `Photo added: ${PHOTO_STAGE_LABELS[input.stage]}`, [
      {
        field: 'Photo',
        after: `${PHOTO_STAGE_LABELS[input.stage]}${input.caption ? `: ${input.caption}` : ''}${file.redacted ? ' (blurred)' : ''}`,
      },
    ]);

    return HttpResponse.json({ photo }, { status: 201 });
  }),
];