import { STATUS_LABELS } from '@civitrace/shared';
import type { AuditEntry } from '@civitrace/shared';
import { mockEvents } from './events';
import { mockVersions } from './versions';
import { mockComplaints } from './complaints';
import { mockProjects } from './projects';

// Starting entries built from the sample history, so the log is not empty
const seeded: AuditEntry[] = [
  ...mockEvents
    .filter((e) => e.fromStatus !== null)
    .map((e): AuditEntry => {
      const from = STATUS_LABELS[e.fromStatus!];
      const to = STATUS_LABELS[e.toStatus];
      return {
        id: `au_${e.id}`,
        at: e.at,
        actorId: e.actorId,
        actorName: e.actorName ?? 'Unknown',
        action: 'complaint.status_changed',
        entityType: 'complaint',
        entityId: e.complaintId,
        entityLabel: mockComplaints.find((c) => c.id === e.complaintId)?.complaintNo ?? e.complaintId,
        summary: `${from} → ${to}`,
        changes: [{ field: 'Status', before: from, after: to }],
      };
    }),
  ...mockVersions.map(
    (v): AuditEntry => ({
      id: `au_${v.id}`,
      at: v.changedAt,
      actorId: 'u_super_1',
      actorName: v.changedBy,
      action: 'project.created',
      entityType: 'project',
      entityId: v.projectId,
      entityLabel: mockProjects.find((p) => p.id === v.projectId)?.projectCode ?? v.projectId,
      summary: 'Created the project record',
    })
  ),
];

export const mockAudit: AuditEntry[] = seeded.sort((a, b) => a.at.localeCompare(b.at));

// Append-only: entries are never edited or deleted
export function recordAudit(entry: Omit<AuditEntry, 'id' | 'at'>) {
  mockAudit.push({ id: `au_${Date.now()}_${mockAudit.length}`, at: new Date().toISOString(), ...entry });
}