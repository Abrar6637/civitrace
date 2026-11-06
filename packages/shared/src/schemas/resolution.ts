import { z } from 'zod';
import { CONFIRMATION_RESPONSES } from '../constants/complaint';
import { geoPointSchema, locationRefSchema } from './location';

// Citizen app se yeh bhejega (form input)
export const resolutionConfirmationInputSchema = z.object({
  complaintId: z.string(),
  response: z.enum(CONFIRMATION_RESPONSES),
  comment: z.string().trim().max(500).optional(),
  location: locationRefSchema, // dobara district, tehsil, UC, shehar/gaon
  point: geoPointSchema,
  evidenceIds: z.array(z.string()).min(1, 'At least one live photo is required'),
  rating: z.number().int().min(1).max(5).optional(),
});

// Database mein save hone wala record
// Database mein save hone wala record
export const resolutionConfirmationSchema = resolutionConfirmationInputSchema.extend({
  id: z.string(),
  citizenId: z.string(),
  distanceFromOriginalM: z.number().nonnegative(), // distance from the original complaint
  locationMismatch: z.boolean(), // UC / tehsil / district do not match
  flagReviewedBy: z.string().optional(), // admin who checked a flagged reply
  flagReviewedAt: z.string().optional(),
  flagReviewNote: z.string().optional(),
  createdAt: z.string(),
});

export type ResolutionConfirmationInput = z.infer<typeof resolutionConfirmationInputSchema>;
export type ResolutionConfirmation = z.infer<typeof resolutionConfirmationSchema>;

// Admin's note after checking a flagged confirmation
export const flagReviewInputSchema = z.object({
  note: z.string().trim().min(5, 'Write what you checked (at least 5 characters)').max(500),
});

export type FlagReviewInput = z.infer<typeof flagReviewInputSchema>;