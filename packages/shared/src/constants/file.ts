export const FILE_KINDS = ['document', 'photo', 'video'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const ALLOWED_MIME_TYPES: Record<FileKind, readonly string[]> = {
  document: ['application/pdf', 'image/jpeg', 'image/png'],
  photo: ['image/jpeg', 'image/png'],
  video: ['video/mp4', 'video/quicktime'], // Android records mp4, iPhone records mov
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (documents and photos)

// Citizen evidence: live camera only
export const EVIDENCE_LIMITS = {
  minItems: 1,
  maxPhotos: 5,
  maxVideos: 1,
  maxVideoSeconds: 30,
  maxVideoBytes: 30 * 1024 * 1024, // 30 MB
};

// GPS worse than this is marked as low confidence
export const GPS_GOOD_ACCURACY_M = 50;