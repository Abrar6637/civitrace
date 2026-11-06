import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, LoaderCircle, Upload } from 'lucide-react';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  validateUpload,
  type FileKind,
  type FileRecord,
} from '@civitrace/shared';
import { filesService } from '@/services/files.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  kind: FileKind;
  value?: FileRecord;
  onUploaded: (file: FileRecord) => void;
  onClear: () => void;
  error?: string;
};

export function FileDropField({ id, kind, value, onUploaded, onClear, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => filesService.upload(file, kind),
    onSuccess: ({ file }) => onUploaded(file),
    onError: (err) => setLocalError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.'),
  });

  function handle(file?: File) {
    if (!file) return;
    setLocalError(null);
    const problem = validateUpload(file, kind);
    if (problem) {
      setLocalError(problem);
      return;
    }
    mutation.mutate(file);
  }

  const shownError = localError ?? error;

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
        <FileText className="size-5 shrink-0 text-slate-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <a
            href={value.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-medium text-brand-700 hover:underline"
          >
            {value.fileName}
          </a>
          <p className="text-xs text-slate-500">
            {formatBytes(value.sizeBytes)} · SHA-256 {value.sha256.slice(0, 12)}…
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-slate-400',
          shownError && 'border-red-300'
        )}
      >
        {mutation.isPending ? (
          <LoaderCircle className="size-6 animate-spin text-brand-600" aria-hidden />
        ) : (
          <Upload className="size-6 text-slate-400" aria-hidden />
        )}
        <p className="text-sm text-slate-700">
          {mutation.isPending ? 'Uploading…' : 'Drop a file here or click to choose'}
        </p>
        <p className="text-xs text-slate-400">
          {kind === 'document' ? 'PDF, JPG or PNG' : 'JPG or PNG'} · up to {formatBytes(MAX_UPLOAD_BYTES)}
        </p>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ALLOWED_MIME_TYPES[kind].join(',')}
        className="sr-only"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = ''; // allow choosing the same file again
        }}
      />
      {shownError && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {shownError}
        </p>
      )}
    </div>
  );
}