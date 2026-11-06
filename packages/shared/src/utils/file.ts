import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, type FileKind } from '../constants/file';

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Same check on the client (before upload) and the server
export function validateUpload(file: { type: string; size: number }, kind: FileKind): string | null {
  if (!ALLOWED_MIME_TYPES[kind].includes(file.type)) {
    return kind === 'document' ? 'Only PDF, JPG or PNG files are allowed.' : 'Only JPG or PNG photos are allowed.';
  }
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return `The file is too large. Maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}