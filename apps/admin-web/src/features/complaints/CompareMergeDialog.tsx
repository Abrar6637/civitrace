import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  CATEGORY_LABELS,
  SETTLEMENT_TYPE_LABELS,
  formatUnionCouncil,
  mergeInputSchema,
  type Complaint,
  type DuplicateCandidate,
  type MergeInput,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { formatDate, formatLength } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from './ComplaintBadges';

type Props = {
  current: Complaint;
  candidate: DuplicateCandidate | null;
  onClose: () => void;
};

export function CompareMergeDialog({ current, candidate, onClose }: Props) {
  return (
    <Dialog
      open={!!candidate}
      size="lg"
      title="Compare and merge"
      description="Check that both reports describe the same problem at the same place."
      onClose={onClose}
    >
      {candidate && <CompareForm key={candidate.id} current={current} candidate={candidate} onClose={onClose} />}
    </Dialog>
  );
}

type Row = { label: string; value: (c: Complaint) => ReactNode };

const ROWS: Row[] = [
  { label: 'Status', value: (c) => <StatusBadge status={c.status} /> },
  { label: 'Category', value: (c) => CATEGORY_LABELS[c.category] },
  { label: 'Description', value: (c) => c.description },
  {
    label: 'City / village',
    value: (c) => `${c.location.settlement.name} (${SETTLEMENT_TYPE_LABELS[c.location.settlement.type]})`,
  },
  { label: 'Union Council', value: (c) => formatUnionCouncil(c.location.unionCouncil) },
  { label: 'Tehsil / district', value: (c) => `${c.location.tehsil}, ${c.location.district}` },
  { label: 'Reported', value: (c) => formatDate(c.createdAt) },
  { label: 'Supporters', value: (c) => c.supportCount },
  { label: 'Hazard', value: (c) => (c.isHazard ? 'Yes' : 'No') },
  { label: 'Linked asset', value: (c) => (c.assetId ? 'Yes' : 'Not linked') },
];

function CompareForm({ current, candidate, onClose }: { current: Complaint; candidate: DuplicateCandidate; onClose: () => void }) {
  const queryClient = useQueryClient();

  // Keep the older report by default
  const [keep, setKeep] = useState<'current' | 'candidate'>(
    current.createdAt <= candidate.createdAt ? 'current' : 'candidate'
  );
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: MergeInput) => complaintsService.merge(input),
    onSuccess: () => {
      for (const key of ['complaint', 'complaints', 'verification', 'dashboard', 'asset']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      onClose();
    },
  });

  const kept = keep === 'current' ? current : candidate;
  const merged = keep === 'current' ? candidate : current;

  function submit() {
    const parsed = mergeInputSchema.safeParse({ primaryId: kept.id, duplicateId: merged.id, note });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? 'Invalid data.');
      return;
    }
    setNoteError(null);
    mutation.mutate(parsed.data);
  }

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Something went wrong.' : null;

  const columns = [
    { id: 'current' as const, complaint: current, label: 'This complaint' },
    { id: 'candidate' as const, complaint: candidate, label: 'Possible duplicate' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Distance apart:{' '}
        <strong className="font-medium text-slate-900">
          {candidate.distanceM !== null ? formatLength(candidate.distanceM) : 'Not available'}
        </strong>
        {candidate.sameAsset && ' · same asset'}
      </p>

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 align-top">
              <th className="w-32 px-5 py-3" />
              {columns.map((col) => (
                <th key={col.id} className="px-5 py-3 text-left font-normal">
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-2',
                      keep === col.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                    )}
                  >
                    <input
                      type="radio"
                      name="keep"
                      checked={keep === col.id}
                      onChange={() => setKeep(col.id)}
                      className="mt-1 accent-brand-600"
                    />
                    <span>
                      <span className="block text-xs text-slate-500">{col.label}</span>
                      <span className="block font-mono text-xs font-medium text-brand-700">{col.complaint.complaintNo}</span>
                      <span className="block text-xs font-medium text-slate-900">
                        {keep === col.id ? 'Keep open' : 'Merge into the other'}
                      </span>
                    </span>
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROWS.map((r) => (
              <tr key={r.label} className="align-top">
                <th scope="row" className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">
                  {r.label}
                </th>
                {columns.map((col) => (
                  <td key={col.id} className="px-5 py-2.5 text-slate-800">
                    {r.value(col.complaint)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <strong className="font-medium text-slate-800">{merged.complaintNo}</strong> will be closed as merged. Its{' '}
        {merged.supportCount + 1} supporter(s), including the reporter, will be added to{' '}
        <strong className="font-medium text-slate-800">{kept.complaintNo}</strong>. You can undo this later.
      </div>

      <FormField label="Why are these the same issue?" htmlFor="merge-note" error={noteError ?? undefined}>
        <Textarea
          id="merge-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Same pothole outside the school gate; photos match."
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
          Merge
        </Button>
      </div>
    </div>
  );
}