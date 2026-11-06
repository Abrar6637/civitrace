import { z } from 'zod';
import { ASSET_CONDITIONS, ASSET_TYPES } from '../constants/asset';
import { VERIFICATION_STATES } from '../constants/verification';
import { geoPointSchema, locationRefSchema } from './location';

const CURRENT_YEAR = new Date().getFullYear();

const yearSchema = z
  .number()
  .int('Enter a whole year')
  .min(1900, 'Year must be 1900 or later')
  .max(CURRENT_YEAR, 'Year cannot be in the future');

// A permanent infrastructure record. Complaints link to it over the years.
export const assetSchema = z.object({
  id: z.string(),
  assetCode: z.string(), // e.g. AS-LHR-RD-00012
  name: z.string(),
  type: z.enum(ASSET_TYPES),
  location: locationRefSchema,
  point: geoPointSchema.optional(),
  lengthM: z.number().positive().optional(), // roads, drains, pipelines
  builtYear: z.number().int().min(1900).max(2100).optional(),
  lastWorkYear: z.number().int().min(1900).max(2100).optional(),
  ownerDepartment: z.string().optional(),
  condition: z.enum(ASSET_CONDITIONS).default('unknown'),
  verification: z.enum(VERIFICATION_STATES), // where this record's data came from
  createdAt: z.string(),
  updatedAt: z.string(),
});

// What an admin sends to create an asset
export const assetCreateInputSchema = z
  .object({
    name: z.string().trim().min(3, 'Enter a name (at least 3 characters)').max(120),
    type: z.enum(ASSET_TYPES),
    location: locationRefSchema,
    point: geoPointSchema.optional(),
    lengthM: z.number().positive('Length must be more than 0').optional(),
    builtYear: yearSchema.optional(),
    lastWorkYear: yearSchema.optional(),
    ownerDepartment: z.string().trim().max(120).optional(),
    linkComplaintId: z.string().optional(), // link this complaint right after creating
  })
  .refine((v) => !v.builtYear || !v.lastWorkYear || v.lastWorkYear >= v.builtYear, {
    message: 'Last work year cannot be before the built year',
    path: ['lastWorkYear'],
  });

// Link a complaint to an asset (assetId: null = unlink)
export const complaintAssetLinkInputSchema = z.object({
  assetId: z.string().nullable(),
  note: z.string().trim().max(500).optional(),
});

export type Asset = z.infer<typeof assetSchema>;
export type AssetCreateInput = z.infer<typeof assetCreateInputSchema>;
export type AssetCreateFormValues = z.input<typeof assetCreateInputSchema>;
export type ComplaintAssetLinkInput = z.infer<typeof complaintAssetLinkInputSchema>;