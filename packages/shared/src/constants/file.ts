export const FILE_KINDS = ['document', 'photo'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const ALLOWED_MIME_TYPES: Record<FileKind, readonly string[]> = {
  document: ['application/pdf', 'image/jpeg', 'image/png'],
  photo: ['image/jpeg', 'image/png'],
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB