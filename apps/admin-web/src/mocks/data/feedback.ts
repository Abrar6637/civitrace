import { distanceInMeters, feedbackWindows } from '@civitrace/shared';
import type { ConditionFeedback, DamageType, FeedbackReviewStatus } from '@civitrace/shared';
import { mockProjects } from './projects';

function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(123);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

const DAY = 86_400_000;
const REPORTERS = ['u_citizen_1', 'u_citizen_2', 'u_citizen_3', 'u_citizen_4'];
const BAD_DAMAGE: DamageType[] = ['cracks', 'potholes', 'surface_worn', 'edge_broken', 'waterlogging'];

const NARRATIVES: Record<number, string[]> = {
  5: ['Road is in very good condition.', 'Still smooth, no problems at all.'],
  4: ['Good condition, a few small marks.', 'Fine overall.'],
  3: ['Some cracks are appearing near the edges.', 'Surface is wearing in a few places.'],
  2: ['Potholes have started again after the rain.', 'Edges are breaking near the market.'],
  1: ['Large potholes, very hard to drive.', 'Water stands on the road for days.'],
};

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

export const mockFeedback: ConditionFeedback[] = [];

let seq = 0;
const now = Date.now();

function add(
  projectId: string,
  assetId: string,
  origin: { lat: number; lng: number },
  period: ConditionFeedback['reviewPeriod'],
  score: number,
  submittedMs: number,
  status: FeedbackReviewStatus
) {
  seq += 1;
  const far = rand() < 0.12; // some photos taken too far away
  const point = {
    lat: origin.lat + (far ? 0.006 : (rand() - 0.5) * 0.002),
    lng: origin.lng + (far ? 0.005 : (rand() - 0.5) * 0.002),
    accuracyM: Math.round(8 + rand() * 30),
  };
  const damageTypes: DamageType[] =
    score >= 4 ? ['none'] : [...new Set([pick(BAD_DAMAGE), ...(rand() < 0.5 ? [pick(BAD_DAMAGE)] : [])])];

  mockFeedback.push({
    id: `fb_${String(seq).padStart(4, '0')}`,
    assetId,
    projectId,
    reporterId: pick(REPORTERS),
    reviewPeriod: period,
    conditionScore: score,
    damageTypes,
    narrative: pick(NARRATIVES[score]!),
    evidenceIds: [`ev_fb_${seq}_1`, ...(rand() < 0.5 ? [`ev_fb_${seq}_2`] : [])],
    point,
    distanceFromAssetM: distanceInMeters(origin, point),
    submittedAt: new Date(Math.min(now, submittedMs)).toISOString(),
    reviewStatus: status,
    reviewedBy: status === 'pending' ? undefined : 'Ayesha Khan',
    reviewedAt: status === 'pending' ? undefined : new Date(Math.min(now, submittedMs + 3 * DAY)).toISOString(),
    reviewNote: status === 'rejected' ? 'Photo does not show this road.' : undefined,
  });
}

for (const p of mockProjects) {
  if (p.status !== 'completed' || !p.actualEnd || !p.point || p.assetIds.length === 0) continue;

  // Keep the checked values in constants so TypeScript knows they exist inside the callbacks
  const origin = p.point;
  const completedAt = p.actualEnd;
  const assetId = p.assetIds[0]!;
  const declining = rand() < 0.4; // some works get worse over time
  const windows = feedbackWindows(completedAt).filter((w) => w.state !== 'upcoming');

  windows.forEach((w, k) => {
    const opensMs = new Date(`${w.opensAt}T00:00:00Z`).getTime();
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const base = declining ? 4.2 - k * 1.3 : 4.3;
      const score = clamp(base + (rand() - 0.5) * 1.4);
      const status: FeedbackReviewStatus =
        w.state === 'open' && rand() < 0.6 ? 'pending' : rand() < 0.9 ? 'accepted' : 'rejected';
      add(p.id, assetId, origin, w.period, score, opensMs + Math.floor(rand() * 25) * DAY, status);
    }
  });

  // An unscheduled damage report on some declining works
  if (declining && rand() < 0.7) {
    add(p.id, assetId, origin, 'ad_hoc', clamp(1 + rand()), now - Math.floor(rand() * 20) * DAY, 'pending');
  }
}