import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Paperclip, Plus } from 'lucide-react';
import {
  PROJECT_DOCUMENT_TYPE_LABELS,
  formatBytes,
  type ProjectDocumentWithFile,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DocumentForm } from './DocumentForm';

type Props = {
  projectId: string;
  documents: ProjectDocumentWithFile[];
};

export function DocumentList({ projectId, documents }: Props) {
  const queryClient = useQueryClient();
  const userName = useAuthStore((s) => s.user?.name);
  const [adding, setAdding] = useState(false);

  const verify = useMutation({
    mutationFn: (documentId: string) => projectsService.verifyDocument(projectId, documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  const verifyError = verify.error instanceof ApiError ? verify.error.message : verify.error ? 'Could not verify.' : null;

  return (
    <div className="space-y-4">
      {documents.length === 0 && !adding && <p className="text-sm text-slate-500">No documents attached yet.</p>}

      <ul className="space-y-4">
        {documents.map((d) => {
          const ownUpload = !!d.uploadedBy && d.uploadedBy === userName;
          return (
            <li key={d.id} className="flex gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-medium text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-500">
                  {[
                    d.title !== PROJECT_DOCUMENT_TYPE_LABELS[d.documentType] && PROJECT_DOCUMENT_TYPE_LABELS[d.documentType],
                    d.referenceNo,
                    d.issuer,
                    d.issuedAt && formatDate(d.issuedAt),
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Details not available'}
                </p>

                {d.file ? (
                  <a
                    href={d.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
                  >
                    <Paperclip className="size-3.5" aria-hidden />
                    {d.file.fileName} ({formatBytes(d.file.sizeBytes)})
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">No file attached</p>
                )}

                {d.verifiedAt ? (
                  <p className="flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Verified by {d.verifiedBy ?? 'admin'} on {formatDate(d.verifiedAt)}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-amber-700">Not verified yet</span>
                    {d.fileId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        disabled={ownUpload || verify.isPending}
                        loading={verify.isPending && verify.variables === d.id}
                        title={ownUpload ? 'Another admin must verify a document you uploaded.' : undefined}
                        onClick={() => verify.mutate(d.id)}
                      >
                        Mark verified
                      </Button>
                    )}
                    {ownUpload && <span className="text-xs text-slate-400">Needs another admin</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {verifyError && <p role="alert" className="text-xs text-red-600">{verifyError}</p>}

      {adding ? (
        <DocumentForm projectId={projectId} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          Add document
        </Button>
      )}
    </div>
  );
}