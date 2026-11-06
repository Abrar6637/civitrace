import { z } from 'zod';
import { DAMAGE_TYPES, FEEDBACK_REVIEW_STATUSES, REVIEW_PERIODS } from '../constants/feedback';
import { geoPointSchema } from './location';

// Documentation 4.5: citizen condition feedback after completion
export const conditionFeedbackSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  projectId: z.string().optional(),
  reporterId: z.string(),
  reviewPeriod: z.enum(REVIEW_PERIODS),
  conditionScore: z.number().int().min(1).max(5), // 1 = very poor, 5 = very good
  damageTypes: z.array(z.enum(DAMAGE_TYPES)),
  narrative: z.string().optional(),
  evidenceIds: z.array(z.string()).min(1), // live camera photos
  point: geoPointSchema, // approximate location
  distanceFromAssetM: z.number().nonnegative().optional(),
  submittedAt: z.string(),
  reviewStatus: z.enum(FEEDBACK_REVIEW_STATUSES),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNote: z.string().optional(),
});

export const feedbackReviewInputSchema = z
  .object({
    decision: z.enum(['accepted', 'rejected']),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision === 'accepted' || (!!v.note && v.note.length >= 5), {
    message: 'Give a reason (at least 5 characters)',
    path: ['note'],
  });

export type ConditionFeedback = z.infer<typeof conditionFeedbackSchema>;
export type FeedbackReviewInput = z.infer<typeof feedbackReviewInputSchema>;