import { http, HttpResponse, delay } from 'msw';
import {
  COMPLAINT_CATEGORIES,
  OPEN_COMPLAINT_STATUSES,
  PROJECT_STATUSES,
  calculateBudgetTotals,
} from '@civitrace/shared';
import type { AggregateAmount, Complaint, ReportSummary } from '@civitrace/shared';
import { mockEvents } from '../data/events';
import { mockBudgets, mockProjects } from '../data/projects';
import { mockFeedback } from '../data/feedback';
import { mockAssets } from '../data/assets';
import { getSessionUser } from './auth';
import { visibleComplaints } from './complaints';

const DAY = 86_400_000;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const inRange = (iso: string, from: string | null, to: string | null) => {
  const day = iso.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
};

function median(values: number[]) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
}

const isResolvedConfirmed = (c: Complaint) =>
  (c.status === 'resolved' || c.status === 'closed') && c.citizenConfirmation === 'confirmed';

// Days from submission to the citizen's "fixed" confirmation
function daysToResolve(c: Complaint) {
  const event = mockEvents.find((e) => e.complaintId === c.id && e.toStatus === 'resolved');
  if (!event) return undefined;
  return Math.max(0, Math.round((Date.parse(event.at) - Date.parse(c.createdAt)) / DAY));
}

function aggregate(values: (number | undefined)[]): AggregateAmount {
  const known = values.filter((v): v is number => v !== undefined);
  return { sum: known.reduce((t, v) => t + v, 0), counted: known.length, missing: values.length - known.length };
}

export const reportHandlers = [
  http.get('/api/v1/reports/summary', async ({ request }) => {
    await delay(500);
    const user = getSessionUser();
    let complaints = visibleComplaints();
    if (!user || !complaints) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const district = params.get('district');

    // Complaints received in the period, with their current outcome
    complaints = complaints.filter((c) => inRange(c.createdAt, from, to));
    if (district) complaints = complaints.filter((c) => c.location.district === district);

    const allowed = user.role === 'area_admin' ? (user.assignedDistricts ?? []) : null;
    let projects = mockProjects.filter((p) => !allowed || allowed.includes(p.location.district));
    if (district) projects = projects.filter((p) => p.location.district === district);

    const projectTotals = projects.map((p) => calculateBudgetTotals(mockBudgets.filter((b) => b.projectId === p.id)));

    const feedback = mockFeedback.filter((f) => {
      if (f.reviewStatus !== 'accepted' || !inRange(f.submittedAt, from, to)) return false;
      const assetDistrict = mockAssets.find((a) => a.id === f.assetId)?.location.district;
      if (!assetDistrict) return false;
      if (allowed && !allowed.includes(assetDistrict)) return false;
      return !district || assetDistrict === district;
    });

    const districts = [...new Set([...complaints.map((c) => c.location.district), ...projects.map((p) => p.location.district)])].sort();

    const resolvedDays = (list: Complaint[]) =>
      list.filter(isResolvedConfirmed).map(daysToResolve).filter((d): d is number => d !== undefined);

    const body: ReportSummary = {
      districts,
      complaints: {
        received: complaints.length,
        open: complaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
        resolvedConfirmed: complaints.filter(isResolvedConfirmed).length,
        closedNoResponse: complaints.filter((c) => c.citizenConfirmation === 'no_response').length,
        rejected: complaints.filter((c) => c.status === 'rejected').length,
        merged: complaints.filter((c) => !!c.mergedIntoId).length,
        medianDaysToResolve: median(resolvedDays(complaints)),
      },
      byCategory: COMPLAINT_CATEGORIES.map((category) => {
        const list = complaints!.filter((c) => c.category === category);
        return {
          category,
          received: list.length,
          open: list.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
          resolvedConfirmed: list.filter(isResolvedConfirmed).length,
        };
      }).filter((r) => r.received > 0),
      // Alphabetical on purpose: this is not a ranking
      byDistrict: districts.map((d) => {
        const list = complaints!.filter((c) => c.location.district === d);
        return {
          district: d,
          received: list.length,
          open: list.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
          resolvedConfirmed: list.filter(isResolvedConfirmed).length,
          medianDaysToResolve: median(resolvedDays(list)),
        };
      }),
      projects: {
        total: projects.length,
        byStatus: PROJECT_STATUSES.map((status) => ({
          status,
          count: projects.filter((p) => p.status === status).length,
        })).filter((s) => s.count > 0),
        applicable: aggregate(projectTotals.map((t) => t.applicable)),
        spent: aggregate(projectTotals.map((t) => t.spent)),
        acceptedFeedback: feedback.length,
        averageCondition: feedback.length
          ? Math.round((feedback.reduce((t, f) => t + f.conditionScore, 0) / feedback.length) * 10) / 10
          : undefined,
      },
    };
    return HttpResponse.json(body);
  }),
];