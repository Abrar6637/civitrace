import { z } from 'zod';
import {
  FUNDING_SOURCES,
  INVOLVEMENT_TYPES,
  MILESTONE_STATUSES,
   PHOTO_STAGES,
  PROJECT_DOCUMENT_TYPES,
  PROJECT_STATUSES,
  REPRESENTATIVE_OFFICES,
} from '../constants/project';
import { VERIFICATION_STATES } from '../constants/verification';
import { geoPointSchema, locationRefSchema } from './location';

// Money is stored as whole paisa (Rs 1 = 100 paisa) to avoid rounding errors
const minorAmount = z.number().int().nonnegative();
const isoDate = z.string(); // YYYY-MM-DD

export const contractorSchema = z.object({
  id: z.string(),
  name: z.string(),
  registrationNo: z.string().optional(),
  verification: z.enum(VERIFICATION_STATES),
});

export const projectSchema = z.object({
  id: z.string(),
  projectCode: z.string(), // e.g. PRJ-LAH-2025-0004
  title: z.string(),
  scope: z.string(),
  status: z.enum(PROJECT_STATUSES),
  assetIds: z.array(z.string()).default([]),
  complaintIds: z.array(z.string()).default([]),
  location: locationRefSchema,
  point: geoPointSchema.optional(),
  executingDepartment: z.string().optional(),
  contractor: contractorSchema.optional(),
  fundingSource: z.enum(FUNDING_SOURCES).optional(),

  // Schedule
  proposedAt: isoDate.optional(),
  approvedAt: isoDate.optional(),
  plannedStart: isoDate.optional(),
  plannedEnd: isoDate.optional(),
  actualStart: isoDate.optional(),
  actualEnd: isoDate.optional(),
  plannedProgressPct: z.number().min(0).max(100).optional(),
  actualProgressPct: z.number().min(0).max(100).optional(),
  delayReason: z.string().optional(),

  // Scope details used for like-for-like comparison
  lengthM: z.number().positive().optional(),
  widthM: z.number().positive().optional(),
  constructionType: z.string().optional(),

  verification: z.enum(VERIFICATION_STATES),
  lastVerifiedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// One row per fiscal year. Each amount is kept separately, never merged.
export const projectBudgetSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  fiscalYear: z.string(), // e.g. 2025-26
  currency: z.literal('PKR'),
  approvedMinor: minorAmount.optional(), // original approved
  revisedMinor: minorAmount.optional(), // after revision, if any
  releasedMinor: minorAmount.optional(), // funds released
  spentMinor: minorAmount.optional(), // verified expenditure
  verification: z.enum(VERIFICATION_STATES),
  sourceDocumentId: z.string().optional(),
});

export const milestoneSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  plannedAt: isoDate.optional(),
  actualAt: isoDate.optional(),
  status: z.enum(MILESTONE_STATUSES),
  note: z.string().optional(),
});

export const projectDocumentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  documentType: z.enum(PROJECT_DOCUMENT_TYPES),
  title: z.string(),
  issuer: z.string().optional(),
  referenceNo: z.string().optional(),
  issuedAt: isoDate.optional(),
  fileId: z.string().optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: isoDate.optional(),
});

export const representativeInvolvementSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  representativeName: z.string(),
  office: z.enum(REPRESENTATIVE_OFFICES),
  constituency: z.string(),
  involvementType: z.enum(INVOLVEMENT_TYPES),
  date: isoDate,
  sourceDocumentId: z.string(), // required: no involvement without evidence
});

export type Contractor = z.infer<typeof contractorSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectBudget = z.infer<typeof projectBudgetSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;
export type RepresentativeInvolvement = z.infer<typeof representativeInvolvementSchema>;
// ---------- Admin form input (amounts in rupees; the server converts to paisa) ----------

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional();
const optionalRupees = z.number().nonnegative('Amount cannot be negative').optional();
const optionalPct = z.number().min(0, 'Enter 0 to 100').max(100, 'Enter 0 to 100').optional();

export const budgetRowInputSchema = z.object({
  id: z.string().optional(), // existing row when editing
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use the format 2025-26'),
  approvedRupees: optionalRupees,
  revisedRupees: optionalRupees,
  releasedRupees: optionalRupees,
  spentRupees: optionalRupees,
});

const projectInputBase = z.object({
  title: z.string().trim().min(5, 'Enter a title (at least 5 characters)').max(200),
  scope: z.string().trim().min(10, 'Describe the scope (at least 10 characters)').max(2000),
  status: z.enum(PROJECT_STATUSES),
  assetIds: z.array(z.string()).min(1, 'Select at least one asset'),
  executingDepartment: optionalText(120),
  contractorName: optionalText(160),
  contractorRegistrationNo: optionalText(60),
  fundingSource: z.enum(FUNDING_SOURCES).optional(),
  proposedAt: optionalDate,
  approvedAt: optionalDate,
  plannedStart: optionalDate,
  plannedEnd: optionalDate,
  actualStart: optionalDate,
  actualEnd: optionalDate,
  plannedProgressPct: optionalPct,
  actualProgressPct: optionalPct,
  delayReason: optionalText(500),
  lengthM: z.number().positive('Must be more than 0').optional(),
  widthM: z.number().positive('Must be more than 0').optional(),
  constructionType: optionalText(120),
  budgets: z.array(budgetRowInputSchema),
  changeReason: optionalText(500),
});

function makeProjectInputSchema({ requireReason }: { requireReason: boolean }) {
  return projectInputBase.superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (v.plannedStart && v.plannedEnd && v.plannedEnd < v.plannedStart) {
      issue(['plannedEnd'], 'Planned end cannot be before planned start');
    }
    if (v.actualStart && v.actualEnd && v.actualEnd < v.actualStart) {
      issue(['actualEnd'], 'Actual end cannot be before actual start');
    }
    if (v.status === 'completed' && !v.actualEnd) {
      issue(['actualEnd'], 'Enter the actual end date for a completed project');
    }
    if ((v.status === 'stalled' || v.status === 'cancelled') && !v.delayReason) {
      issue(['delayReason'], 'Explain why the project is stalled or cancelled');
    }
    if (v.contractorRegistrationNo && !v.contractorName) {
      issue(['contractorName'], 'Enter the contractor name');
    }

    const seen = new Set<string>();
    v.budgets.forEach((b, i) => {
      if (seen.has(b.fiscalYear)) issue(['budgets', i, 'fiscalYear'], 'This fiscal year is already listed');
      seen.add(b.fiscalYear);
    });

    if (requireReason && (!v.changeReason || v.changeReason.length < 5)) {
      issue(['changeReason'], 'Explain what changed and why (at least 5 characters)');
    }
  });
}

export const projectInputSchema = makeProjectInputSchema({ requireReason: false });
export const projectUpdateInputSchema = makeProjectInputSchema({ requireReason: true });

export type BudgetRowInput = z.infer<typeof budgetRowInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectFormValues = z.input<typeof projectInputSchema>;

// ---------- Documents and milestones ----------

const today = () => new Date().toISOString().slice(0, 10);

export const documentInputSchema = z
  .object({
    documentType: z.enum(PROJECT_DOCUMENT_TYPES),
    title: z.string().trim().min(3, 'Enter a title').max(160),
    issuer: optionalText(120),
    referenceNo: optionalText(80),
    issuedAt: optionalDate,
    fileId: z.string().min(1, 'Attach the document file'),
  })
  .refine((v) => !v.issuedAt || v.issuedAt <= today(), {
    message: 'Issue date cannot be in the future',
    path: ['issuedAt'],
  });

export const milestoneInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Enter a title').max(160),
    status: z.enum(MILESTONE_STATUSES),
    plannedAt: optionalDate,
    actualAt: optionalDate,
    note: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'done' && !v.actualAt) {
      ctx.addIssue({ code: 'custom', path: ['actualAt'], message: 'Enter the date it was done' });
    }
    if (v.status !== 'done' && v.actualAt) {
      ctx.addIssue({ code: 'custom', path: ['status'], message: 'Set the status to Done when an actual date is entered' });
    }
    if (v.actualAt && v.actualAt > today()) {
      ctx.addIssue({ code: 'custom', path: ['actualAt'], message: 'Actual date cannot be in the future' });
    }
  });

export type DocumentInput = z.infer<typeof documentInputSchema>;
export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

// ---------- Photos ----------

export const projectPhotoSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  stage: z.enum(PHOTO_STAGES),
  caption: z.string().optional(),
  takenAt: isoDate.optional(),
  fileId: z.string(), // public copy (blurred, metadata removed)
  originalFileId: z.string().optional(), // admins only
  uploadedBy: z.string(),
  uploadedAt: z.string(),
});

const photoMetaShape = {
  stage: z.enum(PHOTO_STAGES),
  caption: optionalText(200),
  takenAt: optionalDate,
};

const takenAtNotInFuture = (v: { takenAt?: string }) => !v.takenAt || v.takenAt <= today();
const futureDateError = { message: 'Date cannot be in the future', path: ['takenAt'] };

// The form fields the admin fills in
export const photoMetaSchema = z.object(photoMetaShape).refine(takenAtNotInFuture, futureDateError);

// What is sent to the server after both files are uploaded
export const photoInputSchema = z
  .object({
    ...photoMetaShape,
    fileId: z.string().min(1, 'Add a photo'),
    originalFileId: z.string().optional(),
    noSensitiveContentConfirmed: z.boolean().optional(),
  })
  .refine(takenAtNotInFuture, futureDateError);

export type ProjectPhoto = z.infer<typeof projectPhotoSchema>;
export type PhotoMeta = z.infer<typeof photoMetaSchema>;
export type PhotoInput = z.infer<typeof photoInputSchema>;

// Mark a budget row as documented by linking a verified document
export const budgetVerifyInputSchema = z.object({
  sourceDocumentId: z.string().min(1, 'Choose the source document'),
});

export type BudgetVerifyInput = z.infer<typeof budgetVerifyInputSchema>;