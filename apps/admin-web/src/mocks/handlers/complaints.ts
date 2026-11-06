import { http, HttpResponse, delay } from 'msw';
import {
  CONFIRMATION_WINDOW_DAYS,
  OPEN_COMPLAINT_STATUSES,
  REJECTION_REASON_LABELS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  complaintAssetLinkInputSchema,
  distanceInMeters,
  findDuplicateCandidates,
  isSameArea,
  mergeInputSchema,
  statusChangeInputSchema,
  unmergeInputSchema,
} from '@civitrace/shared';
import { recordAudit } from '../data/audit';
import type {
  Complaint,
  ComplaintDetail,
  ComplaintStatus,
  ConfirmationResponse,
  Paginated,
  ResolutionConfirmation,
} from '@civitrace/shared';
import { mockComplaints, verificationFor } from '../data/complaints';
import { mockConfirmations, mockEvents } from '../data/events';
import { mockAssets } from '../data/assets';
import { getSessionUser } from './auth';

const DAY = 86_400_000;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

// Area admins only see complaints in their districts
export function visibleComplaints() {
  const user = getSessionUser();
  if (!user) return null;
  if (user.role === 'area_admin') {
    const districts = user.assignedDistricts ?? [];
    return mockComplaints.filter((c) => districts.includes(c.location.district));
  }
  return mockComplaints;
}

// Adds a record to the complaint timeline
// Adds a record to the complaint timeline and to the audit log
export function addEvent(
  complaint: Complaint,
  fromStatus: ComplaintStatus,
  toStatus: ComplaintStatus,
  note: string,
  actor: { id: string; name: string }
) {
  mockEvents.push({
    id: `${complaint.id}_e${Date.now()}`,
    complaintId: complaint.id,
    fromStatus,
    toStatus,
    note,
    evidenceIds: [],
    actorId: actor.id,
    actorName: actor.name,
    at: new Date().toISOString(),
  });

  const statusChanged = fromStatus !== toStatus;
  recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: statusChanged ? 'complaint.status_changed' : 'complaint.updated',
    entityType: 'complaint',
    entityId: complaint.id,
    entityLabel: complaint.complaintNo,
    summary: statusChanged ? `${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[toStatus]}: ${note}` : note,
    changes: statusChanged
      ? [{ field: 'Status', before: STATUS_LABELS[fromStatus], after: STATUS_LABELS[toStatus] }]
      : undefined,
  });
}

export const complaintHandlers = [
  // List
  http.get('/api/v1/complaints', async ({ request }) => {
    await delay(400);
    let rows = visibleComplaints();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const status = params.get('status');
    const category = params.get('category');
    const district = params.get('district');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

    if (status) rows = rows.filter((c) => c.status === status);
    if (category) rows = rows.filter((c) => c.category === category);
    if (district) rows = rows.filter((c) => c.location.district === district);

    // Search number, text, tehsil, UC (name or number) and city/village
    if (q) {
      rows = rows.filter((c) => {
        const l = c.location;
        return [
          c.complaintNo,
          c.description,
          l.tehsil,
          l.settlement.name,
          l.unionCouncil.name ?? '',
          l.unionCouncil.number ? `uc-${l.unionCouncil.number}` : '',
        ].some((field) => field.toLowerCase().includes(q));
      });
    }

    const body: Paginated<Complaint> = {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: rows.length,
    };
    return HttpResponse.json(body);
  }),

  // Detail: complaint + timeline + citizen reply + linked asset
   // Detail: complaint + timeline + citizen reply + asset + duplicates
  http.get('/api/v1/complaints/:id', async ({ params }) => {
    await delay(300);
    const rows = visibleComplaints();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = rows.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');

    const parent = complaint.mergedIntoId ? mockComplaints.find((c) => c.id === complaint.mergedIntoId) : undefined;

    const body: ComplaintDetail = {
      complaint,
      events: mockEvents
        .filter((e) => e.complaintId === complaint.id)
        .sort((a, b) => a.at.localeCompare(b.at)),
      confirmation: mockConfirmations.filter((r) => r.complaintId === complaint.id).at(-1) ?? null,
      asset: mockAssets.find((a) => a.id === complaint.assetId) ?? null,
      duplicates: findDuplicateCandidates(complaint, rows),
      mergedInto: parent ? { id: parent.id, complaintNo: parent.complaintNo } : null,
      mergedFrom: mockComplaints.filter((c) => complaint.mergedFromIds?.includes(c.id)),
    };
    return HttpResponse.json(body);
  }),

  // Admin status change
  http.post('/api/v1/complaints/:id/status', async ({ params, request }) => {
    await delay(500);
    const user = getSessionUser();
    const rows = visibleComplaints();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = rows.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');

    const parsed = statusChangeInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const { toStatus, note, rejectionReason } = parsed.data;
    const fromStatus = complaint.status;

    if (!STATUS_TRANSITIONS[fromStatus].includes(toStatus)) {
      return errorResponse(409, 'INVALID_TRANSITION', 'This status change is not allowed.');
    }

    complaint.status = toStatus;
    complaint.verification = verificationFor(toStatus);
    complaint.updatedAt = new Date().toISOString();

    if (toStatus === 'awaiting_confirmation') {
      complaint.citizenConfirmation = 'pending';
      complaint.confirmationDueAt = new Date(
        Date.now() + CONFIRMATION_WINDOW_DAYS * DAY
      ).toISOString();
    }

    const fullNote = rejectionReason ? `${REJECTION_REASON_LABELS[rejectionReason]}: ${note}` : note;
    addEvent(complaint, fromStatus, toStatus, fullNote, user);

    return HttpResponse.json({ complaint });
  }),

  // Link, change or remove the asset of a complaint
  http.post('/api/v1/complaints/:id/asset', async ({ params, request }) => {
    await delay(400);
    const user = getSessionUser();
    const rows = visibleComplaints();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = rows.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');

    const parsed = complaintAssetLinkInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const { assetId, note } = parsed.data;
    const previous = mockAssets.find((a) => a.id === complaint.assetId);
    const target = assetId ? mockAssets.find((a) => a.id === assetId) : null;

    if (assetId && !target) return errorResponse(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    if (target && target.location.district !== complaint.location.district) {
      return errorResponse(409, 'DISTRICT_MISMATCH', 'The asset must be in the same district as the complaint.');
    }

    complaint.assetId = target?.id;
    complaint.updatedAt = new Date().toISOString();

    const text = target
      ? `Linked to asset ${target.assetCode}${previous ? ` (was ${previous.assetCode})` : ''}.`
      : `Unlinked from asset ${previous?.assetCode ?? ''}.`;
    addEvent(complaint, complaint.status, complaint.status, note ? `${text} ${note}` : text, user);

    return HttpResponse.json({ complaint });
  }),

  // Mock only: simulate the citizen's reply (the mobile app will send this)
  http.post('/api/v1/complaints/:id/confirmation', async ({ params, request }) => {
    await delay(500);
    const rows = visibleComplaints();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = rows.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');
    if (complaint.status !== 'awaiting_confirmation') {
      return errorResponse(409, 'NOT_AWAITING', 'This complaint is not waiting for confirmation.');
    }

    const body = (await request.json()) as { response?: ConfirmationResponse };
    const response: ConfirmationResponse = body.response ?? 'resolved';
    const original = complaint.point ?? { lat: 31.52, lng: 74.35 };
    const point = { lat: original.lat + 0.0005, lng: original.lng + 0.0004, accuracyM: 10 };

    const confirmation: ResolutionConfirmation = {
      id: `rc_${complaint.id}_${Date.now()}`,
      complaintId: complaint.id,
      citizenId: complaint.reporterId,
      response,
      comment: response === 'resolved' ? 'Fixed, thank you.' : 'The work is not complete.',
      location: complaint.location,
      point,
      evidenceIds: [`ev_${complaint.id}_${Date.now()}`],
      rating: response === 'resolved' ? 5 : 2,
      distanceFromOriginalM: distanceInMeters(original, point),
      locationMismatch: !isSameArea(complaint.location, complaint.location),
      createdAt: new Date().toISOString(),
    };
    mockConfirmations.push(confirmation);

    const fromStatus = complaint.status;
    const toStatus: ComplaintStatus = response === 'resolved' ? 'resolved' : 'reopened';
    complaint.status = toStatus;
    complaint.verification = verificationFor(toStatus);
    complaint.citizenConfirmation = response === 'resolved' ? 'confirmed' : 'disputed';
    complaint.updatedAt = confirmation.createdAt;

    addEvent(
      complaint,
      fromStatus,
      toStatus,
      response === 'resolved'
        ? 'Citizen confirmed the issue is fixed.'
        : 'Citizen reported the issue is not fixed.',
      { id: complaint.reporterId, name: 'Bilal Ahmed' }
    );

    return HttpResponse.json({ complaint });
  }),


    // Merge a duplicate into a primary complaint
  http.post('/api/v1/complaints/merge', async ({ request }) => {
    await delay(500);
    const user = getSessionUser();
    const rows = visibleComplaints();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const parsed = mergeInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }
    const { primaryId, duplicateId, note } = parsed.data;

    const primary = rows.find((c) => c.id === primaryId);
    const duplicate = rows.find((c) => c.id === duplicateId);
    if (!primary || !duplicate) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');
    if (primary.mergedIntoId || duplicate.mergedIntoId) {
      return errorResponse(409, 'ALREADY_MERGED', 'One of these complaints is already merged.');
    }
    if (!OPEN_COMPLAINT_STATUSES.includes(primary.status) || !OPEN_COMPLAINT_STATUSES.includes(duplicate.status)) {
      return errorResponse(409, 'NOT_OPEN', 'Only open complaints can be merged.');
    }
    if (primary.location.district !== duplicate.location.district) {
      return errorResponse(409, 'DISTRICT', 'Complaints from different districts cannot be merged.');
    }

    const now = new Date().toISOString();
    const added = duplicate.supportCount + 1; // its supporters plus its reporter
    const fromStatus = duplicate.status;

    duplicate.statusBeforeMerge = fromStatus;
    duplicate.mergeSupportAdded = added;
    duplicate.mergedIntoId = primary.id;
    duplicate.mergedAt = now;
    duplicate.status = 'closed';
    duplicate.updatedAt = now;

    primary.mergedFromIds = [...(primary.mergedFromIds ?? []), duplicate.id];
    primary.supportCount += added;
    if (duplicate.isHazard) primary.isHazard = true;
    if (!primary.assetId && duplicate.assetId) primary.assetId = duplicate.assetId;
    primary.updatedAt = now;

    addEvent(duplicate, fromStatus, 'closed', `Merged into ${primary.complaintNo}. ${note}`, user);
    addEvent(primary, primary.status, primary.status, `${duplicate.complaintNo} merged into this complaint. ${note}`, user);

    return HttpResponse.json({ primary, duplicate });
  }),

  // Undo a merge
  http.post('/api/v1/complaints/:id/unmerge', async ({ params, request }) => {
    await delay(500);
    const user = getSessionUser();
    const rows = visibleComplaints();
    if (!user || !rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const duplicate = rows.find((c) => c.id === params.id);
    if (!duplicate) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');
    if (!duplicate.mergedIntoId) return errorResponse(409, 'NOT_MERGED', 'This complaint is not merged.');

    const parsed = unmergeInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const primary = mockComplaints.find((c) => c.id === duplicate.mergedIntoId);
    const restored = duplicate.statusBeforeMerge ?? 'submitted';
    const now = new Date().toISOString();

    if (primary) {
      primary.mergedFromIds = (primary.mergedFromIds ?? []).filter((id) => id !== duplicate.id);
      primary.supportCount = Math.max(0, primary.supportCount - (duplicate.mergeSupportAdded ?? 0));
      primary.updatedAt = now;
      addEvent(primary, primary.status, primary.status, `${duplicate.complaintNo} separated again. ${parsed.data.note}`, user);
    }

    duplicate.status = restored;
    duplicate.mergedIntoId = undefined;
    duplicate.mergedAt = undefined;
    duplicate.statusBeforeMerge = undefined;
    duplicate.mergeSupportAdded = undefined;
    duplicate.updatedAt = now;
    addEvent(duplicate, 'closed', restored, `Merge undone. ${parsed.data.note}`, user);

    return HttpResponse.json({ complaint: duplicate });
  }),
];