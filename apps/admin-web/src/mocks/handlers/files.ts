import { http, HttpResponse, delay } from 'msw';
import { FILE_KINDS, validateUpload, type FileKind, type FileRecord } from '@civitrace/shared';
import { mockFiles } from '../data/files';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const fileHandlers = [
  http.post('/api/v1/files', async ({ request }) => {
    await delay(700);
    const user = getSessionUser();
    if (!user) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind');

    if (!(file instanceof File)) return errorResponse(400, 'NO_FILE', 'No file was sent.');
    if (typeof kind !== 'string' || !(FILE_KINDS as readonly string[]).includes(kind)) {
      return errorResponse(400, 'BAD_KIND', 'Unknown file kind.');
    }

    const problem = validateUpload(file, kind as FileKind);
    if (problem) return errorResponse(400, 'BAD_FILE', problem);

    const originalFileId = form.get('originalFileId');
    const record: FileRecord = {
      id: `f_${Date.now()}`,
      kind: kind as FileKind,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256: await sha256(file),
      url: URL.createObjectURL(file), // the real backend will return a signed URL
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString(),
      redacted: form.get('redacted') === 'true',
      originalFileId: typeof originalFileId === 'string' && originalFileId ? originalFileId : undefined,
    };
    mockFiles.push(record);

    return HttpResponse.json({ file: record }, { status: 201 });
  }),
];