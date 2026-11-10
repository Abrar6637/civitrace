import type { ReportDraft } from '../store/report-draft';

// Turns the draft into what the API expects.
// With the real backend, each file is uploaded first and its returned id is used here.
export function buildSubmitPayload(d: ReportDraft) {
  return {
    clientDraftId: d.draftId,
    category: d.category,
    description: d.description.trim() || undefined,
    voiceNoteFileId: d.voiceNote ? `local:${d.voiceNote.uri}` : undefined,
    location: d.location,
    point: d.point,
    lowConfidenceGps: d.lowConfidenceGps,
    isHazard: d.isHazard,
    notifyMna: d.notifyMna,
    notifyMpa: d.notifyMpa,
    evidence: d.evidence.map((e) => ({
      fileId: `local:${e.uri}`,
      kind: e.kind,
      capturedAt: e.capturedAt,
      durationSec: e.durationSec,
      source: 'live_camera' as const,
    })),
  };
}