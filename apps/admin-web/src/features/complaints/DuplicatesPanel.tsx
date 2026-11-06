import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, GitMerge } from 'lucide-react';
import {
  CATEGORY_LABELS,
  DUPLICATE_RADIUS_M,
  unmergeInputSchema,
  type Complaint,
  type DuplicateCandidate,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { formatDate, formatLength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from './ComplaintBadges';
import { CompareMergeDialog } from './CompareMergeDialog';

type Props = {
  complaint: Complaint;
  duplicates: DuplicateCandidate[];
  mergedInto: { id: string; complaintNo: string } | null;
  mergedFrom: Complaint[];
};

export function DuplicatesPanel({ complaint, duplicates, mergedInto, mergedFrom }: Props) {
  const [comparing, setComparing] = useState<DuplicateCandidate | null>(null);
  const [undoOpen, setUndoOpen] = useState(false);

  // This complaint was merged into another one
  if (complaint.mergedIntoId) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <GitMerge className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          <p>
            Merged into{' '}
            {mergedInto ? (
              <Link to={`/complaints/${mergedInto.id}`} className="font-mono font-medium text-brand-700 hover:underline">
                {mergedInto.complaintNo}
              </Link>
            ) : (
              'another complaint'
            )}
            {complaint.mergedAt && ` on ${formatDate(complaint.mergedAt)}`}. Its supporters were added there.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setUndoOpen(true)}>
          Undo merge
        </Button>
        <UnmergeDialog complaint={complaint} open={undoOpen} onClose={() => setUndoOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mergedFrom.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Merged into this ({mergedFrom.length})
          </p>
          <ul className="space-y-1">
            {mergedFrom.map((c) => (
              <li key={c.id}>
                <Link to={`/complaints/${c.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                  {c.complaintNo}
                </Link>
                <span className="text-xs text-slate-400"> · {formatDate(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {duplicates.length === 0 ? (
        <p className="text-sm text-slate-500">No likely duplicates found.</p>
      ) : (
        <ul className="space-y-2">
          {duplicates.map((d) => (
            <li key={d.id} className="space-y-1 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/complaints/${d.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                  {d.complaintNo}
                </Link>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-xs text-slate-500">
                {CATEGORY_LABELS[d.category]} ·{' '}
                {d.distanceM !== null ? `${formatLength(d.distanceM)} away` : 'Distance not available'}
                {d.sameAsset && ' · same asset'} · {formatDate(d.createdAt)}
              </p>
              <p className="truncate text-xs text-slate-600">{d.description}</p>
              <Button size="sm" variant="secondary" className="mt-1" onClick={() => setComparing(d)}>
                Compare
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400">
        Shows open complaints of the same category within {DUPLICATE_RADIUS_M} m, or on the same asset.
      </p>

      <CompareMergeDialog current={complaint} candidate={comparing} onClose={() => setComparing(null)} />
    </div>
  );
}

function UnmergeDialog({ complaint, open, onClose }: { complaint: Complaint; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (n: string) => complaintsService.unmerge(complaint.id, { note: n }),
    onSuccess: () => {
      for (const key of ['complaint', 'complaints', 'verification', 'dashboard']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      setNote('');
      onClose();
    },
  });

  function submit() {
    const parsed = unmergeInputSchema.safeParse({ note });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? 'Invalid data.');
      return;
    }
    setNoteError(null);
    mutation.mutate(parsed.data.note);
  }

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  return (
    <Dialog
      open={open}
      title={`Undo merge of ${complaint.complaintNo}?`}
      description="It will open again with its previous status, and its supporters will be removed from the other complaint."
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Reason" htmlFor="unmerge-note" error={noteError ?? undefined}>
          <Textarea
            id="unmerge-note"
            rows={2}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Different streets; the photos show two separate potholes."
            invalid={!!noteError}
          />
        </FormField>
        {serverError && (
          <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Undo merge
          </Button>
        </div>
      </div>
    </Dialog>
  );
}