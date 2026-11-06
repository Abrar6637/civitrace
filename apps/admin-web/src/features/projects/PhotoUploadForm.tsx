import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ImagePlus, ShieldCheck } from 'lucide-react';
import {
  ALLOWED_MIME_TYPES,
  PHOTO_STAGES,
  PHOTO_STAGE_LABELS,
  photoMetaSchema,
  validateUpload,
  type PhotoMeta,
} from '@civitrace/shared';
import { filesService } from '@/services/files.service';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { loadImage, redactImage, type Box } from '@/lib/redact';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RedactionEditor } from '@/features/files/RedactionEditor';

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const toOptional = (v: unknown) => (v === '' ? undefined : v);

type Source = { file: File; img: HTMLImageElement; url: string };

type Props = {
  projectId: string;
  onDone: () => void;
  onCancel: () => void;
};

export function PhotoUploadForm({ projectId, onDone, onCancel }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [confirmedNone, setConfirmedNone] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Free the preview memory when the photo changes or the form closes
  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source.url);
  }, [source]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhotoMeta>({
    resolver: zodResolver(photoMetaSchema),
    defaultValues: { stage: 'after' },
  });

  async function choose(file?: File) {
    if (!file) return;
    setFileError(null);
    const problem = validateUpload(file, 'photo');
    if (problem) {
      setFileError(problem);
      return;
    }
    try {
      const { img, url } = await loadImage(file);
      setSource({ file, img, url });
      setBoxes([]);
      setConfirmedNone(false);
      setShowConfirmError(false);
    } catch {
      setFileError('This image could not be opened. Try another file.');
    }
  }

  const mutation = useMutation({
    mutationFn: async (meta: PhotoMeta) => {
      if (!source) throw new Error('No photo selected.');

      // 1. Keep the untouched original (admins only)
      const original = await filesService.upload(source.file, 'photo');

      // 2. Make the public copy: blurred boxes, metadata removed
      const blob = await redactImage(source.img, boxes);
      const baseName = source.file.name.replace(/\.[^.]+$/, '');
      const publicCopy = new File([blob], `${baseName}-public.jpg`, { type: 'image/jpeg' });
      const uploaded = await filesService.upload(publicCopy, 'photo', {
        redacted: boxes.length > 0,
        originalFileId: original.file.id,
      });

      // 3. Attach to the project
      return projectsService.addPhoto(projectId, {
        ...meta,
        fileId: uploaded.file.id,
        originalFileId: original.file.id,
        noSensitiveContentConfirmed: boxes.length === 0 ? confirmedNone : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onDone();
    },
  });

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Could not save the photo. Please try again.'
        : null;

  function onSubmit(meta: PhotoMeta) {
    if (boxes.length === 0 && !confirmedNone) {
      setShowConfirmError(true);
      return;
    }
    mutation.mutate(meta);
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-900">Add photo</p>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.photo.join(',')}
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!source ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-8 text-center hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ImagePlus className="size-6 text-slate-400" aria-hidden />
            <span className="text-sm text-slate-700">Choose a photo</span>
            <span className="text-xs text-slate-400">JPG or PNG · up to 10 MB</span>
          </button>
          {fileError && (
            <p role="alert" className="text-xs text-red-600">
              {fileError}
            </p>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <RedactionEditor
            src={source.url}
            naturalWidth={source.img.naturalWidth}
            naturalHeight={source.img.naturalHeight}
            boxes={boxes}
            onChange={(next) => {
              setBoxes(next);
              setShowConfirmError(false);
            }}
            disabled={mutation.isPending}
          />

          {boxes.length === 0 && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmedNone}
                onChange={(e) => {
                  setConfirmedNone(e.target.checked);
                  setShowConfirmError(false);
                }}
                className="mt-0.5 size-4 accent-brand-600"
              />
              I checked this photo. No faces or number plates are visible.
            </label>
          )}
          {showConfirmError && (
            <p role="alert" className="text-xs text-red-600">
              Mark every face and number plate, or confirm that none are visible.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Stage" htmlFor="ph-stage" error={errors.stage?.message}>
              <Select id="ph-stage" {...register('stage')}>
                {PHOTO_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {PHOTO_STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date taken" htmlFor="ph-date" error={errors.takenAt?.message}>
              <Input
                id="ph-date"
                type="date"
                invalid={!!errors.takenAt}
                {...register('takenAt', { setValueAs: toOptional })}
              />
            </FormField>
            <FormField label="Caption" htmlFor="ph-caption" error={errors.caption?.message}>
              <Input id="ph-caption" placeholder="Optional" {...register('caption', { setValueAs: toText })} />
            </FormField>
          </div>

          <div className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
            <span>
              The public copy is pixelated in the marked areas and re-saved without hidden location data. The original is
              kept for admins only.
            </span>
          </div>

          {serverError && (
            <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {serverError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={mutation.isPending}>
              Save photo
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              Choose another
            </Button>
            <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}