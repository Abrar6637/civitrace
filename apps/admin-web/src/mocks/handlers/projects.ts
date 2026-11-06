import { http, HttpResponse, delay } from 'msw';
import {
  FUNDING_SOURCE_LABELS,
  PROJECT_STATUS_LABELS,
  calculateBudgetTotals,
  districtCode,
  formatRupees,
  projectInputSchema,
  projectUpdateInputSchema,
  rupeesToMinor,
} from '@civitrace/shared';
import { recordAudit } from '../data/audit';
import { mockFeedback } from '../data/feedback';
import type {
  Asset,
  FieldChange,
  Paginated,
  Project,
  ProjectBudget,
  ProjectDetail,
  ProjectInput,
  ProjectSummary,
  User,
} from '@civitrace/shared';
import {
  mockBudgets,
  mockDocuments,
  mockInvolvements,
  mockMilestones,
  mockProjects,
} from '../data/projects';
import { mockVersions } from '../data/versions';
import { mockAssets } from '../data/assets';
import { mockComplaints } from '../data/complaints';
import { mockFiles } from '../data/files';
import { mockPhotos } from '../data/photos';
import { getSessionUser } from './auth';

const NA = 'Not available';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

// Area admins only see projects in their districts
function visibleProjects() {
  const user = getSessionUser();
  if (!user) return null;
  if (user.role === 'area_admin') {
    const districts = user.assignedDistricts ?? [];
    return mockProjects.filter((p) => districts.includes(p.location.district));
  }
  return mockProjects;
}

const budgetsOf = (id: string) =>
  mockBudgets.filter((b) => b.projectId === id).sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));

const toMinor = (rupees?: number) => (rupees === undefined ? undefined : rupeesToMinor(rupees));

// ---------- Version history helpers ----------

// A readable snapshot of a project, used to find what changed between versions
function describe(p: Project, budgets: ProjectBudget[]): Record<string, string> {
  const text = (v?: string | number) => (v === undefined || v === '' ? NA : String(v));
  const money = (m?: number) => (m === undefined ? NA : formatRupees(m));
  const pct = (v?: number) => (v === undefined ? NA : `${v}%`);

  const snapshot: Record<string, string> = {
    Title: p.title,
    Scope: p.scope,
    Status: PROJECT_STATUS_LABELS[p.status],
    Assets: p.assetIds.map((id) => mockAssets.find((a) => a.id === id)?.assetCode ?? id).join(', '),
    'Executing department': text(p.executingDepartment),
    Contractor: p.contractor
      ? `${p.contractor.name}${p.contractor.registrationNo ? ` (${p.contractor.registrationNo})` : ''}`
      : NA,
    'Funding source': p.fundingSource ? FUNDING_SOURCE_LABELS[p.fundingSource] : NA,
    Proposed: text(p.proposedAt),
    Approved: text(p.approvedAt),
    'Planned start': text(p.plannedStart),
    'Planned end': text(p.plannedEnd),
    'Actual start': text(p.actualStart),
    'Actual end': text(p.actualEnd),
    'Planned progress': pct(p.plannedProgressPct),
    'Actual progress': pct(p.actualProgressPct),
    'Status note': text(p.delayReason),
    Length: p.lengthM !== undefined ? `${p.lengthM} m` : NA,
    Width: p.widthM !== undefined ? `${p.widthM} m` : NA,
    'Construction type': text(p.constructionType),
  };

  for (const b of budgets) {
    snapshot[`Budget ${b.fiscalYear}: approved`] = money(b.approvedMinor);
    snapshot[`Budget ${b.fiscalYear}: revised`] = money(b.revisedMinor);
    snapshot[`Budget ${b.fiscalYear}: released`] = money(b.releasedMinor);
    snapshot[`Budget ${b.fiscalYear}: verified spent`] = money(b.spentMinor);
  }
  return snapshot;
}

function diff(before: Record<string, string>, after: Record<string, string>): FieldChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => before[k] !== after[k])
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

// ---------- Building records from form input ----------

function checkAssets(user: User, ids: string[]): { assets: Asset[] } | { error: string } {
  const assets = ids.map((id) => mockAssets.find((a) => a.id === id)).filter((a): a is Asset => !!a);
  if (assets.length !== ids.length) return { error: 'One or more selected assets were not found.' };

  const district = assets[0]!.location.district;
  if (assets.some((a) => a.location.district !== district)) {
    return { error: 'All assets of a project must be in the same district.' };
  }
  if (user.role === 'area_admin' && !(user.assignedDistricts ?? []).includes(district)) {
    return { error: 'You can only manage projects in your own districts.' };
  }
  return { assets };
}

type ProjectFields = Omit<Project, 'id' | 'projectCode' | 'verification' | 'lastVerifiedAt' | 'createdAt' | 'updatedAt'>;

function buildFields(input: ProjectInput, assets: Asset[], previous?: Project): ProjectFields {
  const first = assets[0]!;
  const prevContractor = previous?.contractor;
  const sameContractor =
    !!prevContractor &&
    prevContractor.name === input.contractorName &&
    prevContractor.registrationNo === input.contractorRegistrationNo;

  return {
    title: input.title,
    scope: input.scope,
    status: input.status,
    assetIds: assets.map((a) => a.id),
    complaintIds: mockComplaints
      .filter((c) => c.assetId && input.assetIds.includes(c.assetId))
      .map((c) => c.id),
    location: first.location,
    point: first.point,
    executingDepartment: input.executingDepartment,
    contractor: input.contractorName
      ? {
          id: sameContractor ? prevContractor.id : `k_${Date.now()}`,
          name: input.contractorName,
          registrationNo: input.contractorRegistrationNo,
          verification: sameContractor ? prevContractor.verification : 'under_review',
        }
      : undefined,
    fundingSource: input.fundingSource,
    proposedAt: input.proposedAt,
    approvedAt: input.approvedAt,
    plannedStart: input.plannedStart,
    plannedEnd: input.plannedEnd,
    actualStart: input.actualStart,
    actualEnd: input.actualEnd,
    plannedProgressPct: input.plannedProgressPct,
    actualProgressPct: input.actualProgressPct,
    delayReason: input.delayReason,
    lengthM: input.lengthM,
    widthM: input.widthM,
    constructionType: input.constructionType,
  };
}

// Changed or new budget rows go back to "under review" until a document is attached
function buildBudgets(projectId: string, rows: ProjectInput['budgets'], old: ProjectBudget[]): ProjectBudget[] {
  return rows.map((row, k) => {
    const prev = row.id ? old.find((b) => b.id === row.id) : undefined;
    const amounts = {
      approvedMinor: toMinor(row.approvedRupees),
      revisedMinor: toMinor(row.revisedRupees),
      releasedMinor: toMinor(row.releasedRupees),
      spentMinor: toMinor(row.spentRupees),
    };
    const unchanged =
      !!prev &&
      prev.fiscalYear === row.fiscalYear &&
      prev.approvedMinor === amounts.approvedMinor &&
      prev.revisedMinor === amounts.revisedMinor &&
      prev.releasedMinor === amounts.releasedMinor &&
      prev.spentMinor === amounts.spentMinor;

    return {
      id: prev?.id ?? `${projectId}_b${Date.now()}_${k}`,
      projectId,
      fiscalYear: row.fiscalYear,
      currency: 'PKR',
      ...amounts,
      verification: unchanged && prev ? prev.verification : 'under_review',
      sourceDocumentId: unchanged && prev ? prev.sourceDocumentId : undefined,
    };
  });
}

function replaceBudgets(projectId: string, rows: ProjectBudget[]) {
  for (let i = mockBudgets.length - 1; i >= 0; i--) {
    if (mockBudgets[i]!.projectId === projectId) mockBudgets.splice(i, 1);
  }
  mockBudgets.push(...rows);
}

// ---------- Handlers ----------

export const projectHandlers = [
  // List
  http.get('/api/v1/projects', async ({ request }) => {
    await delay(400);
    let rows = visibleProjects();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const status = params.get('status');
    const fundingSource = params.get('fundingSource');
    const district = params.get('district');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

    if (status) rows = rows.filter((p) => p.status === status);
    if (fundingSource) rows = rows.filter((p) => p.fundingSource === fundingSource);
    if (district) rows = rows.filter((p) => p.location.district === district);
    if (q) {
      rows = rows.filter((p) =>
        [p.projectCode, p.title, p.location.settlement.name, p.location.tehsil, p.contractor?.name ?? '']
          .some((field) => field.toLowerCase().includes(q))
      );
    }

    // Newest first
    const summaries: ProjectSummary[] = [...rows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({ ...p, totals: calculateBudgetTotals(budgetsOf(p.id)) }));

    const body: Paginated<ProjectSummary> = {
      data: summaries.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: summaries.length,
    };
    return HttpResponse.json(body);
  }),

  // Detail
  http.get('/api/v1/projects/:id', async ({ params }) => {
    await delay(300);
    const rows = visibleProjects();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const project = rows.find((p) => p.id === params.id);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const budgets = budgetsOf(project.id);

    const body: ProjectDetail = {
      project,
      totals: calculateBudgetTotals(budgets),
      budgets,
      milestones: mockMilestones.filter((m) => m.projectId === project.id),
      documents: mockDocuments
        .filter((d) => d.projectId === project.id)
        .map((d) => ({ ...d, file: mockFiles.find((f) => f.id === d.fileId) })),
      involvements: mockInvolvements.filter((r) => r.projectId === project.id),
      assets: mockAssets.filter((a) => project.assetIds.includes(a.id)),
      complaints: mockComplaints
        .filter((c) => project.complaintIds.includes(c.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      history: mockVersions
        .filter((v) => v.projectId === project.id)
        .sort((a, b) => b.version - a.version),
      photos: mockPhotos
        .filter((ph) => ph.projectId === project.id)
        .map((ph) => ({
          ...ph,
          file: mockFiles.find((f) => f.id === ph.fileId),
          original: mockFiles.find((f) => f.id === ph.originalFileId),
        })),
              feedback: mockFeedback
        .filter((f) => f.projectId === project.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    };
    return HttpResponse.json(body);
  }),

  // Create
  http.post('/api/v1/projects', async ({ request }) => {
    await delay(600);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const parsed = projectInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;

    const checked = checkAssets(user, input.assetIds);
    if ('error' in checked) return errorResponse(400, 'INVALID_ASSETS', checked.error);

    const seq = String(mockProjects.length + 1).padStart(4, '0');
    const id = `p_${seq}`;
    const year = (input.approvedAt ?? new Date().toISOString()).slice(0, 4);
    const now = new Date().toISOString();

    const project: Project = {
      id,
      projectCode: `PRJ-${districtCode(checked.assets[0]!.location.district)}-${year}-${seq}`,
      ...buildFields(input, checked.assets),
      verification: 'under_review', // until documents are attached and checked
      createdAt: now,
      updatedAt: now,
    };

    mockProjects.push(project);
    mockBudgets.push(...buildBudgets(id, input.budgets, []));
    mockVersions.push({
      id: `${id}_v1`,
      projectId: id,
      version: 1,
      action: 'created',
      changedBy: user.name,
      changedAt: now,
      reason: input.changeReason,
      changes: [],
    });

        recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: 'project.created',
      entityType: 'project',
      entityId: id,
      entityLabel: project.projectCode,
      summary: `Created the project record: ${project.title}`,
    });

    return HttpResponse.json({ project }, { status: 201 });
  }),

  // Update (keeps the previous version in history)
  http.patch('/api/v1/projects/:id', async ({ params, request }) => {
    await delay(600);
    const user = getSessionUser();
    const rows = visibleProjects();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const project = rows.find((p) => p.id === params.id);
    if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found.');

    const parsed = projectUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const input = parsed.data;

    const checked = checkAssets(user, input.assetIds);
    if ('error' in checked) return errorResponse(400, 'INVALID_ASSETS', checked.error);

    const oldBudgets = budgetsOf(project.id);
    const newBudgets = buildBudgets(project.id, input.budgets, oldBudgets);
    const updated: Project = {
      ...project,
      ...buildFields(input, checked.assets, project),
      updatedAt: new Date().toISOString(),
    };

    const changes = diff(describe(project, oldBudgets), describe(updated, newBudgets));
    if (changes.length === 0) return errorResponse(400, 'NO_CHANGES', 'Nothing was changed.');

    Object.assign(project, updated);
    replaceBudgets(project.id, newBudgets);

    mockVersions.push({
      id: `${project.id}_v${Date.now()}`,
      projectId: project.id,
      version: mockVersions.filter((v) => v.projectId === project.id).length + 1,
      action: 'updated',
      changedBy: user.name,
      changedAt: updated.updatedAt,
      reason: input.changeReason,
      changes,
    });

        recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: 'project.updated',
      entityType: 'project',
      entityId: project.id,
      entityLabel: project.projectCode,
      summary: input.changeReason ?? 'Updated the project',
      changes,
    });

    return HttpResponse.json({ project });
  }),
];