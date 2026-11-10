import { ALLOWED_MIME_TYPES, EVIDENCE_LIMITS, MAX_UPLOAD_BYTES, type FileKind } from '../constants/file';

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_MESSAGES: Record<FileKind, string> = {
  document: 'Only PDF, JPG or PNG files are allowed.',
  photo: 'Only JPG or PNG photos are allowed.',
  video: 'Only MP4 or MOV videos are allowed.',
};

// Same check on the client (before upload) and the server
export function validateUpload(file: { type: string; size: number }, kind: FileKind): string | null {
  if (!ALLOWED_MIME_TYPES[kind].includes(file.type)) return TYPE_MESSAGES[kind];
  if (file.size === 0) return 'The file is empty.';
  const max = kind === 'video' ? EVIDENCE_LIMITS.maxVideoBytes : MAX_UPLOAD_BYTES;
  if (file.size > max) return `The file is too large. Maximum size is ${formatBytes(max)}.`;
  return null;
}