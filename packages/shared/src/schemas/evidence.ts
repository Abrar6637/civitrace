import { z } from 'zod';

export const EVIDENCE_KINDS = ['photo', 'video', 'voice'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

// Every item starts as "pending". Only an admin can make it public.
export const EVIDENCE_REVIEW_STATES = ['pending', 'public', 'hidden'] as const;
export type EvidenceReviewState = (typeof EVIDENCE_REVIEW_STATES)[number];

export const EVIDENCE_REVIEW_LABELS: Record<EvidenceReviewState, string> = {
  pending: 'Not checked',
  public: 'Public',
  hidden: 'Hidden',
};

export const evidenceItemSchema = z.object({
  id: z.string(),
  complaintId: z.string(),
  kind: z.enum(EVIDENCE_KINDS),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  durationSec: z.number().positive().optional(),
  capturedAt: z.string(),
  source: z.enum(['live_camera', 'microphone']), // never the gallery
  gpsAccuracyM: z.number().nonnegative().optional(),
  reviewState: z.enum(EVIDENCE_REVIEW_STATES),
  reviewedById: z.string().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  hideReason: z.string().optional(),
});

export const evidenceReviewInputSchema = z
  .object({
    decision: z.enum(['public', 'hidden']),
    checks: z
      .object({
        noFaces: z.boolean(),
        noPlates: z.boolean(),
        noPersonalInfo: z.boolean(),
      })
      .optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === 'public' && !(v.checks?.noFaces && v.checks.noPlates && v.checks.noPersonalInfo)) {
      ctx.addIssue({ code: 'custom', path: ['checks'], message: 'Confirm all three privacy checks before making this public' });
    }
    if (v.decision === 'hidden' && (v.reason?.length ?? 0) < 5) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Give a reason (at least 5 characters)' });
    }
  });

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type EvidenceReviewInput = z.infer<typeof evidenceReviewInputSchema>;