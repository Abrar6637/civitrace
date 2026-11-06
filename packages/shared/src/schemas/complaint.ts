import { z } from 'zod';
import {
  CITIZEN_CONFIRMATION_STATES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  REJECTION_REASONS,
} from '../constants/complaint';
import { VERIFICATION_STATES } from '../constants/verification';
import { geoPointSchema, locationRefSchema } from './location';

export const complaintSchema = z.object({
  id: z.string(),
  complaintNo: z.string(), // public number, jaise CT-LHR-2026-000123
  reporterId: z.string(),
  assetId: z.string().optional(),
  category: z.enum(COMPLAINT_CATEGORIES),
  description: z.string(),
  location: locationRefSchema, // district, tehsil, UC, shehar/gaon
  point: geoPointSchema.optional(),
  lowConfidenceGps: z.boolean().default(false),
  status: z.enum(COMPLAINT_STATUSES),
  verification: z.enum(VERIFICATION_STATES),
  citizenConfirmation: z.enum(CITIZEN_CONFIRMATION_STATES).default('not_requested'),
  confirmationDueAt: z.string().optional(), // is tareekh tak citizen jawab de
  notifyMna: z.boolean().default(false),
  notifyMpa: z.boolean().default(false),
  suggestedDepartmentId: z.string().optional(),
  assignedVerifierId: z.string().optional(),
  supportCount: z.number().int().nonnegative().default(0),
  isHazard: z.boolean().default(false),
    mergedIntoId: z.string().optional(), // this complaint was merged into another
  mergedFromIds: z.array(z.string()).optional(), // complaints merged into this one
  mergedAt: z.string().optional(),
  statusBeforeMerge: z.enum(COMPLAINT_STATUSES).optional(), // to undo a merge
  mergeSupportAdded: z.number().int().nonnegative().optional(), // to undo a merge
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Har status change ka record (documentation: complaintEvents)
export const complaintEventSchema = z.object({
  id: z.string(),
  complaintId: z.string(),
  fromStatus: z.enum(COMPLAINT_STATUSES).nullable(),
  toStatus: z.enum(COMPLAINT_STATUSES),
  note: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
  actorId: z.string(),
  actorName: z.string().optional(), // dikhane ke liye
  at: z.string(),
});

// Admin jab status badalta hai to yeh bhejta hai
export const statusChangeInputSchema = z
  .object({
    toStatus: z.enum(COMPLAINT_STATUSES),
    note: z.string().trim().min(5, 'Write a note (at least 5 characters)').max(1000),
    rejectionReason: z.enum(REJECTION_REASONS).optional(),
  })
  .refine((v) => v.toStatus !== 'rejected' || !!v.rejectionReason, {
    message: 'Choose a reason for rejection',
    path: ['rejectionReason'],
  });

export type Complaint = z.infer<typeof complaintSchema>;
export type ComplaintEvent = z.infer<typeof complaintEventSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeInputSchema>;

// Assign a complaint to a verifier (null = unassign)
export const assignInputSchema = z.object({
  verifierId: z.string().nullable(),
});

export type AssignInput = z.infer<typeof assignInputSchema>;

export const mergeInputSchema = z
  .object({
    primaryId: z.string(), // the complaint that stays open
    duplicateId: z.string(), // the complaint that is merged into it
    note: z.string().trim().min(5, 'Explain why these are the same issue (at least 5 characters)').max(500),
  })
  .refine((v) => v.primaryId !== v.duplicateId, {
    message: 'Choose two different complaints',
    path: ['duplicateId'],
  });

export const unmergeInputSchema = z.object({
  note: z.string().trim().min(5, 'Explain why you are undoing the merge (at least 5 characters)').max(500),
});

export type MergeInput = z.infer<typeof mergeInputSchema>;
export type UnmergeInput = z.infer<typeof unmergeInputSchema>;