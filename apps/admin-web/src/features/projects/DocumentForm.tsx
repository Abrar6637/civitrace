import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  PROJECT_DOCUMENT_TYPES,
  PROJECT_DOCUMENT_TYPE_LABELS,
  documentInputSchema,
  type DocumentInput,
  type FileRecord,
  type ProjectDocumentType,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FileDropField } from '@/features/files/FileDropField';

const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const toOptional = (v: unknown) => (v === '' ? undefined : v);

type Props = {
  projectId: string;
  onDone: () => void;
  onCancel: () => void;
};

export function DocumentForm({ projectId, onDone, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<FileRecord | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<DocumentInput>({
    resolver: zodResolver(documentInputSchema),
    defaultValues: {
      documentType: 'administrative_approval',
      title: PROJECT_DOCUMENT_TYPE_LABELS.administrative_approval,
      fileId: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (input: DocumentInput) => projectsService.addDocument(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onDone();
    },
  });

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 p-4"
    >
      <p className="text-sm font-medium text-slate-900">Add document</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="doc-type" error={errors.documentType?.message}>
          <Select
            id="doc-type"
            {...register('documentType', {
              onChange: (e) =>
                setValue('title', PROJECT_DOCUMENT_TYPE_LABELS[e.target.value as ProjectDocumentType]),
            })}
          >
            {PROJECT_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Title" htmlFor="doc-title" error={errors.title?.message}>
          <Input id="doc-title" invalid={!!errors.title} {...register('title')} />
        </FormField>
        <FormField label="Issued by" htmlFor="doc-issuer" error={errors.issuer?.message}>
          <Input id="doc-issuer" placeholder="e.g. C&W Department, Lahore" {...register('issuer', { setValueAs: toText })} />
        </FormField>
        <FormField label="Reference no." htmlFor="doc-ref" error={errors.referenceNo?.message}>
          <Input id="doc-ref" placeholder="e.g. No. 412/2026" {...register('referenceNo', { setValueAs: toText })} />
        </FormField>
        <FormField label="Issue date" htmlFor="doc-date" error={errors.issuedAt?.message}>
          <Input
            id="doc-date"
            type="date"
            invalid={!!errors.issuedAt}
            {...register('issuedAt', { setValueAs: toOptional })}
          />
        </FormField>
      </div>

      <FormField label="File" htmlFor="doc-file" error={undefined}>
        <FileDropField
          id="doc-file"
          kind="document"
          value={file}
          error={errors.fileId?.message}
          onUploaded={(f) => {
            setFile(f);
            setValue('fileId', f.id, { shouldValidate: isSubmitted });
          }}
          onClear={() => {
            setFile(undefined);
            setValue('fileId', '', { shouldValidate: isSubmitted });
          }}
        />
      </FormField>

      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          Save document
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}