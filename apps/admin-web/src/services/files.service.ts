import type { FileKind, FileRecord } from '@civitrace/shared';
import { api } from './api';

type UploadOptions = { redacted?: boolean; originalFileId?: string };

export const filesService = {
  upload: (file: File, kind: FileKind, options: UploadOptions = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    if (options.redacted) form.append('redacted', 'true');
    if (options.originalFileId) form.append('originalFileId', options.originalFileId);
    return api.upload<{ file: FileRecord }>('/files', form);
  },
};