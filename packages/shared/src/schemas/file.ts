import { z } from 'zod';
import { FILE_KINDS } from '../constants/file';

export const fileRecordSchema = z.object({
  id: z.string(),
  kind: z.enum(FILE_KINDS),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string(), // fingerprint to detect later changes
  url: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  redacted: z.boolean().default(false), // faces / number plates blurred
  originalFileId: z.string().optional(), // the unblurred original, admin only
});

export type FileRecord = z.infer<typeof fileRecordSchema>;