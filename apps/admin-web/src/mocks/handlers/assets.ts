import { http, HttpResponse, delay } from 'msw';
import {
  ASSET_TYPE_CODES,
  CATEGORY_TO_ASSET_TYPE,
  NEARBY_ASSET_RADIUS_M,
  REPEAT_ISSUE_WINDOW_YEARS,
  assetCreateInputSchema,
  distanceInMeters,
  districtCode,
} from '@civitrace/shared';
import { mockProjects } from '../data/projects';
import { recordAudit } from '../data/audit';
import type {
  Asset,
  AssetDetail,
  AssetSummary,
  ComplaintStatus,
  NearbyAsset,
  Paginated,
} from '@civitrace/shared';
import { mockAssets } from '../data/assets';
import { mockComplaints } from '../data/complaints';
import { getSessionUser } from './auth';
import { addEvent, visibleComplaints } from './complaints';

const FINISHED: ComplaintStatus[] = ['resolved', 'closed', 'rejected'];

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

// Adds complaint counts and the repeat-issue flag to an asset
function summarize(asset: Asset): AssetSummary {
  const complaints = mockComplaints.filter((c) => c.assetId === asset.id);
  const lastComplaintAt = complaints.reduce<string | undefined>(
    (max, c) => (!max || c.createdAt > max ? c.createdAt : max),
    undefined
  );
  const repeatIssue =
    asset.lastWorkYear !== undefined &&
    complaints.some((c) => {
      const yearsAfterWork = new Date(c.createdAt).getFullYear() - asset.lastWorkYear!;
      return yearsAfterWork >= 0 && yearsAfterWork <= REPEAT_ISSUE_WINDOW_YEARS;
    });

  return {
    ...asset,
    totalComplaints: complaints.length,
    openComplaints: complaints.filter((c) => !FINISHED.includes(c.status)).length,
    lastComplaintAt,
    repeatIssue,
  };
}

// Area admins only see assets in their districts
function visibleAssets() {
  const user = getSessionUser();
  if (!user) return null;
  if (user.role === 'area_admin') {
    const districts = user.assignedDistricts ?? [];
    return mockAssets.filter((a) => districts.includes(a.location.district));
  }
  return mockAssets;
}

export const assetHandlers = [
  // List
  http.get('/api/v1/assets', async ({ request }) => {
    await delay(400);
    let rows = visibleAssets();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const type = params.get('type');
    const condition = params.get('condition');
    const district = params.get('district');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

    if (type) rows = rows.filter((a) => a.type === type);
    if (condition) rows = rows.filter((a) => a.condition === condition);
    if (district) rows = rows.filter((a) => a.location.district === district);
    if (q) {
      rows = rows.filter((a) => {
        const l = a.location;
        return [
          a.assetCode,
          a.name,
          l.tehsil,
          l.settlement.name,
          l.unionCouncil.name ?? '',
          l.unionCouncil.number ? `uc-${l.unionCouncil.number}` : '',
        ].some((field) => field.toLowerCase().includes(q));
      });
    }

    // Most open complaints first
    const summaries = rows
      .map(summarize)
      .sort((a, b) => b.openComplaints - a.openComplaints || a.name.localeCompare(b.name));

    const body: Paginated<AssetSummary> = {
      data: summaries.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: summaries.length,
    };
    return HttpResponse.json(body);
  }),

  // Detail
  http.get('/api/v1/assets/:id', async ({ params }) => {
    await delay(300);
    const rows = visibleAssets();
    if (!rows) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const asset = rows.find((a) => a.id === params.id);
    if (!asset) return errorResponse(404, 'NOT_FOUND', 'Asset not found.');
    const body: AssetDetail = {
      asset: summarize(asset),
      complaints: mockComplaints
        .filter((c) => c.assetId === asset.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      projects: mockProjects.filter((p) => p.assetIds.includes(asset.id)),
    };
    return HttpResponse.json(body);
  }),

  // Assets suggested for a complaint: same tehsil or within the radius
  http.get('/api/v1/complaints/:id/nearby-assets', async ({ params }) => {
    await delay(300);
    const assets = visibleAssets();
    const complaints = visibleComplaints();
    if (!assets || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const complaint = complaints.find((c) => c.id === params.id);
    if (!complaint) return errorResponse(404, 'NOT_FOUND', 'Complaint not found.');

    const wantedType = CATEGORY_TO_ASSET_TYPE[complaint.category];
    const distanceTo = (a: Asset) =>
      complaint.point && a.point ? distanceInMeters(complaint.point, a.point) : null;

    const data: NearbyAsset[] = assets
      .filter((a) => {
        const sameTehsil =
          a.location.district === complaint.location.district &&
          a.location.tehsil === complaint.location.tehsil;
        const d = distanceTo(a);
        return sameTehsil || (d !== null && d <= NEARBY_ASSET_RADIUS_M);
      })
      .map((a) => ({ ...summarize(a), distanceM: distanceTo(a), sameType: a.type === wantedType }))
      .sort(
        (x, y) =>
          Number(y.sameType) - Number(x.sameType) ||
          (x.distanceM ?? Infinity) - (y.distanceM ?? Infinity)
      )
      .slice(0, 10);

    return HttpResponse.json({ data });
  }),

  // Create a new asset (optionally link a complaint to it)
  http.post('/api/v1/assets', async ({ request }) => {
    await delay(500);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const parsed = assetCreateInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid data.');
    }

    const { linkComplaintId, ...fields } = parsed.data;
    if (user.role === 'area_admin' && !(user.assignedDistricts ?? []).includes(fields.location.district)) {
      return errorResponse(403, 'FORBIDDEN', 'You can only add assets in your own districts.');
    }

    const seq = String(mockAssets.length + 1).padStart(5, '0');
    const now = new Date().toISOString();
    const asset: Asset = {
      ...fields,
      id: `a_${seq}`,
      assetCode: `AS-${districtCode(fields.location.district)}-${ASSET_TYPE_CODES[fields.type]}-${seq}`,
      condition: 'unknown',
      verification: 'under_review', // until documents are attached
      createdAt: now,
      updatedAt: now,
    };
    mockAssets.push(asset);
        recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: 'asset.created',
      entityType: 'asset',
      entityId: asset.id,
      entityLabel: asset.assetCode,
      summary: `Created asset: ${asset.name}`,
    });

    if (linkComplaintId) {
      const complaint = visibleComplaints()?.find((c) => c.id === linkComplaintId);
      if (complaint) {
        complaint.assetId = asset.id;
        complaint.updatedAt = now;
        addEvent(complaint, complaint.status, complaint.status, `Linked to new asset ${asset.assetCode}.`, user);
      }
    }

    return HttpResponse.json({ asset: summarize(asset) }, { status: 201 });
  }),
];