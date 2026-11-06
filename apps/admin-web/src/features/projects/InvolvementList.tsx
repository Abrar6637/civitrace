import { Landmark } from 'lucide-react';
import {
  INVOLVEMENT_TYPE_LABELS,
  PROJECT_DOCUMENT_TYPE_LABELS,
  type ProjectDocument,
  type RepresentativeInvolvement,
} from '@civitrace/shared';
import { formatDate } from '@/lib/format';

type Props = {
  involvements: RepresentativeInvolvement[];
  documents: ProjectDocument[];
};

export function InvolvementList({ involvements, documents }: Props) {
  return (
    <div className="space-y-3">
      {involvements.length === 0 ? (
        <p className="text-sm text-slate-500">No documented involvement.</p>
      ) : (
        <ul className="space-y-3">
          {involvements.map((r) => {
            const source = documents.find((d) => d.id === r.sourceDocumentId);
            return (
              <li key={r.id} className="flex gap-3">
                <Landmark className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">
                    {r.office} · {r.representativeName}
                  </p>
                  <p className="text-xs text-slate-500">{r.constituency}</p>
                  <p className="mt-0.5 text-slate-700">
                    {INVOLVEMENT_TYPE_LABELS[r.involvementType]} on {formatDate(r.date)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Source: {source ? PROJECT_DOCUMENT_TYPE_LABELS[source.documentType] : 'Document not found'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-400">
        Only actions backed by a document are recorded. This is not a performance rating.
      </p>
    </div>
  );
}