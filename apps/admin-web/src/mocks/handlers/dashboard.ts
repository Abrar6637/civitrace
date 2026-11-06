import { http, HttpResponse, delay } from 'msw';
import { COMPLAINT_CATEGORIES } from '@civitrace/shared';
import type { ComplaintStatus, DashboardSummary } from '@civitrace/shared';
import { visibleComplaints } from './complaints';

const DAY = 86_400_000;
const FINISHED: ComplaintStatus[] = ['resolved', 'closed', 'rejected'];

const AGING_BUCKETS = [
  { bucket: '0–7 days', min: 0, max: 7 },
  { bucket: '8–30 days', min: 7, max: 30 },
  { bucket: '31–60 days', min: 30, max: 60 },
  { bucket: '60+ days', min: 60, max: Infinity },
];

export const dashboardHandlers = [
  http.get('/api/v1/dashboard/summary', async () => {
    await delay(400);
    const rows = visibleComplaints();
    if (!rows) {
      return HttpResponse.json(
        { error: { code: 'NO_SESSION', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const now = Date.now();
    const ageDays = (iso: string) => (now - new Date(iso).getTime()) / DAY;
    const open = rows.filter((c) => !FINISHED.includes(c.status));

    // Per-district counts
    const districts = new Map<string, DashboardSummary['byDistrict'][number]>();
    for (const c of rows) {
      const name = c.location.district;
      const row = districts.get(name) ?? { district: name, open: 0, awaiting: 0, resolved: 0, total: 0 };
      row.total += 1;
      if (c.status === 'awaiting_confirmation') row.awaiting += 1;
      else if (c.status === 'resolved' || c.status === 'closed') row.resolved += 1;
      else if (c.status !== 'rejected') row.open += 1;
      districts.set(name, row);
    }

    // Complaints per week for the last 12 weeks
    const weekly = Array.from({ length: 12 }, (_, i) => {
      const start = now - (12 - i) * 7 * DAY;
      const end = start + 7 * DAY;
      return {
        weekStart: new Date(start).toISOString(),
        count: rows.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= start && t < end;
        }).length,
      };
    });

    const body: DashboardSummary = {
      kpis: {
        newLast7Days: rows.filter((c) => ageDays(c.createdAt) <= 7).length,
        pendingReview: rows.filter((c) => c.status === 'submitted' || c.status === 'under_review').length,
        awaitingConfirmation: rows.filter((c) => c.status === 'awaiting_confirmation').length,
        openHazards: open.filter((c) => c.isHazard).length,
                resolvedLast30Days: rows.filter(
          (c) =>
            (c.status === 'resolved' || c.status === 'closed') &&
            c.citizenConfirmation === 'confirmed' &&
            ageDays(c.updatedAt) <= 30
        ).length,
        reopened: rows.filter((c) => c.status === 'reopened').length,
      },
      aging: AGING_BUCKETS.map(({ bucket, min, max }) => ({
        bucket,
        count: open.filter((c) => {
          const age = ageDays(c.createdAt);
          return age >= min && age < max;
        }).length,
      })),
      byCategory: COMPLAINT_CATEGORIES.map((category) => ({
        category,
        count: rows.filter((c) => c.category === category).length,
      }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
      byDistrict: [...districts.values()].sort((a, b) => b.total - a.total),
      weekly,
      // Hazards first, then the oldest
      needsAttention: [...open]
        .sort((a, b) => Number(b.isHazard) - Number(a.isHazard) || a.createdAt.localeCompare(b.createdAt))
        .slice(0, 6),
    };

    return HttpResponse.json(body);
  }),
];