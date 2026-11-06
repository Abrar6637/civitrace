import { distanceInMeters, isSameArea } from '@civitrace/shared';
import type { ComplaintEvent, ComplaintStatus, ResolutionConfirmation } from '@civitrace/shared';
import { mockComplaints } from './complaints';

const HAPPY_PATH: ComplaintStatus[] = [
  'submitted', 'under_review', 'published', 'routed', 'acknowledged',
  'action_planned', 'in_progress', 'awaiting_confirmation', 'resolved', 'closed',
];

const NOTES: Partial<Record<ComplaintStatus, string>> = {
  submitted: 'Complaint submitted from mobile app with live photo.',
  under_review: 'Picked up for verification.',
  published: 'Location and photo checked. Published publicly.',
  routed: 'Forwarded to the concerned department with evidence.',
  acknowledged: 'Department acknowledged in writing.',
  action_planned: 'Repair included in the upcoming work plan.',
  in_progress: 'Work started on site.',
  awaiting_confirmation: 'Department reports work completed. Citizen asked to confirm.',
  resolved: 'Citizen confirmed the issue is fixed.',
  reopened: 'Citizen reported the issue is not fixed.',
  closed: 'Closed after citizen confirmation.',
  rejected: 'Duplicate complaint: Same pothole already reported nearby.',
};

// Har status tak pohanchne ka raasta
function pathFor(status: ComplaintStatus): ComplaintStatus[] {
  if (status === 'rejected') return ['submitted', 'under_review', 'rejected'];
  if (status === 'reopened') {
    return [...HAPPY_PATH.slice(0, HAPPY_PATH.indexOf('awaiting_confirmation') + 1), 'reopened'];
  }
  return HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);
}

const CITIZEN_STEPS: ComplaintStatus[] = ['submitted', 'resolved', 'reopened'];

export const mockEvents: ComplaintEvent[] = mockComplaints.flatMap((c) => {
  const path = pathFor(c.status);
  const start = new Date(c.createdAt).getTime();
  const end = new Date(c.updatedAt).getTime();
  const step = path.length > 1 ? (end - start) / (path.length - 1) : 0;

  return path.map((toStatus, i): ComplaintEvent => {
    const byCitizen = CITIZEN_STEPS.includes(toStatus);
    return {
      id: `${c.id}_e${i + 1}`,
      complaintId: c.id,
      fromStatus: i === 0 ? null : path[i - 1]!,
      toStatus,
      note: NOTES[toStatus],
      evidenceIds: [],
      actorId: byCitizen ? c.reporterId : 'u_area_1',
      actorName: byCitizen ? 'Bilal Ahmed' : 'Ayesha Khan',
      at: new Date(start + step * i).toISOString(),
    };
  });
});

// Citizen ke tasdeeq wale jawab
export const mockConfirmations: ResolutionConfirmation[] = mockComplaints
  .filter((c) => ['resolved', 'reopened', 'closed'].includes(c.status) && c.point)
  .map((c, i): ResolutionConfirmation => {
    const disputed = c.status === 'reopened';
    const far = i % 4 === 2; // kuch records mein jagah mel nahi khati (warning test ke liye)
    const original = c.point!;
    const point = {
      lat: original.lat + (far ? 0.01 : 0.0006),
      lng: original.lng + (far ? 0.008 : 0.0004),
      accuracyM: 12,
    };
    const location = far
      ? { ...c.location, unionCouncil: { number: '999', name: 'Other UC' } }
      : c.location;

    return {
      id: `rc_${c.id}`,
      complaintId: c.id,
      citizenId: c.reporterId,
      response: disputed ? 'not_resolved' : 'resolved',
      comment: disputed
        ? 'Only half the road was repaired, potholes are still there.'
        : 'Work done properly, thank you.',
      location,
      point,
      evidenceIds: [`ev_${c.id}_confirm`],
      rating: disputed ? 2 : 4,
      distanceFromOriginalM: distanceInMeters(original, point),
      locationMismatch: !isSameArea(c.location, location),
      createdAt: c.updatedAt,
    };
  });