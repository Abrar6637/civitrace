import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Paperclip, UserCheck } from 'lucide-react';
import {
  CATEGORY_LABELS,
  CONFIRMATION_MAX_DISTANCE_M,
  CONFIRMATION_RESPONSE_LABELS,
  PROJECT_DOCUMENT_TYPE_LABELS,
  flagReviewInputSchema,
  type FlagReviewInput,
  type ResolutionConfirmation,
  type VerificationQueue,
} from '@civitrace/shared';
import { verificationService } from '@/services/verification.service';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { formatAge, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Money } from '@/components/ui/money';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/features/complaints/ComplaintBadges';
import { StatusQuickDialog, type QuickTarget } from './StatusQuickDialog';
import { useQueueRefresh } from './useQueueRefresh';

const DAY = 86_400_000;

const errorText = (err: unknown) =>
  err instanceof ApiError ? err.message : err ? 'Something went wrong. Please try again.' : null;

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center">
      <CheckCircle2 className="size-8 text-emerald-500" aria-hidden />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  const text = errorText(error);
  if (!text) return null;
  return (
    <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {text}
    </div>
  );
}

function Item({ children }: { children: ReactNode }) {
  return <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">{children}</li>;
}

// ---------- 1. New complaints ----------

type Assigned = 'all' | 'me' | 'unassigned';

export function ComplaintQueue({
  data,
  assigned,
  onAssignedChange,
}: {
  data: VerificationQueue;
  assigned: Assigned;
  onAssignedChange: (v: Assigned) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const refresh = useQueueRefresh();
  const [target, setTarget] = useState<QuickTarget | null>(null);

  const assign = useMutation({
    mutationFn: ({ id, verifierId }: { id: string; verifierId: string | null }) =>
      verificationService.assign(id, verifierId),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['all', 'All'],
            ['me', 'Assigned to me'],
            ['unassigned', 'Unassigned'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => onAssignedChange(value)}
            aria-pressed={assigned === value}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              assigned === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorLine error={assign.error} />

      {data.complaints.length === 0 ? (
        <Empty text="No complaints waiting here." />
      ) : (
        <ul className="space-y-3">
          {data.complaints.map((c) => {
            const assignee = c.assignedVerifierId ? data.verifierNames[c.assignedVerifierId] : undefined;
            const mine = c.assignedVerifierId === me?.id;
            return (
              <Item key={c.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/complaints/${c.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                    {c.complaintNo}
                  </Link>
                  <StatusBadge status={c.status} />
                  {c.isHazard && (
                    <Badge tone="red">
                      <AlertTriangle className="size-3" aria-hidden /> Hazard
                    </Badge>
                  )}
                  {c.lowConfidenceGps && <Badge tone="amber">Low GPS accuracy</Badge>}
                  <span className="ml-auto text-xs text-slate-400">{formatAge(c.createdAt)} old</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{CATEGORY_LABELS[c.category]}</p>
                  <p className="text-sm text-slate-600">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.location.settlement.name}, {c.location.tehsil}, {c.location.district}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <UserCheck className="size-3.5" aria-hidden />
                    {assignee ? `Assigned to ${mine ? 'you' : assignee}` : 'Unassigned'}
                  </span>
                  {mine ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={assign.isPending && assign.variables?.id === c.id}
                      onClick={() => assign.mutate({ id: c.id, verifierId: null })}
                    >
                      Unassign
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={assign.isPending && assign.variables?.id === c.id}
                      onClick={() => me && assign.mutate({ id: c.id, verifierId: me.id })}
                    >
                      Assign to me
                    </Button>
                  )}
                  {c.status === 'submitted' && (
                    <Button size="sm" onClick={() => setTarget({ complaint: c, toStatus: 'under_review' })}>
                      Start review
                    </Button>
                  )}
                  {c.status === 'under_review' && (
                    <Button size="sm" onClick={() => setTarget({ complaint: c, toStatus: 'published' })}>
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setTarget({ complaint: c, toStatus: 'rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              </Item>
            );
          })}
        </ul>
      )}

      <StatusQuickDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

// ---------- 2. Flagged confirmations ----------

export function ConfirmationQueue({ data }: { data: VerificationQueue }) {
  const [checking, setChecking] = useState<ResolutionConfirmation | null>(null);

  if (data.confirmations.length === 0) return <Empty text="No citizen confirmations need checking." />;

  return (
    <>
      <ul className="space-y-3">
        {data.confirmations.map(({ confirmation: r, complaint: c }) => (
          <Item key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/complaints/${c.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                {c.complaintNo}
              </Link>
              <StatusBadge status={c.status} />
              <span className="text-sm text-slate-700">
                Citizen said: <strong className="font-medium">{CONFIRMATION_RESPONSE_LABELS[r.response]}</strong>
              </span>
            </div>
            {r.comment && <p className="text-sm text-slate-600">"{r.comment}"</p>}
            <ul className="space-y-1 text-xs text-amber-800">
              {r.locationMismatch && (
                <li className="flex gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  The UC, tehsil or village given does not match the complaint.
                </li>
              )}
              {r.distanceFromOriginalM > CONFIRMATION_MAX_DISTANCE_M && (
                <li className="flex gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  Photo taken {r.distanceFromOriginalM} m from the complaint (limit {CONFIRMATION_MAX_DISTANCE_M} m).
                </li>
              )}
            </ul>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Link
                to={`/complaints/${c.id}`}
                className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Open complaint
              </Link>
              <Button size="sm" onClick={() => setChecking(r)}>
                Mark as checked
              </Button>
            </div>
          </Item>
        ))}
      </ul>

      <Dialog
        open={!!checking}
        title="Mark confirmation as checked"
        description="Write what you checked. This note is saved in the complaint timeline."
        onClose={() => setChecking(null)}
      >
        {checking && <FlagReviewForm key={checking.id} confirmationId={checking.id} onClose={() => setChecking(null)} />}
      </Dialog>
    </>
  );
}

function FlagReviewForm({ confirmationId, onClose }: { confirmationId: string; onClose: () => void }) {
  const refresh = useQueueRefresh();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FlagReviewInput>({ resolver: zodResolver(flagReviewInputSchema) });

  const mutation = useMutation({
    mutationFn: (input: FlagReviewInput) => verificationService.reviewConfirmation(confirmationId, input),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <FormField label="What did you check?" htmlFor="fr-note" error={errors.note?.message}>
        <Textarea
          id="fr-note"
          rows={3}
          autoFocus
          placeholder="e.g. Called the citizen; photo taken from the next street, same road."
          invalid={!!errors.note}
          {...register('note')}
        />
      </FormField>
      <ErrorLine error={mutation.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Mark as checked
        </Button>
      </div>
    </form>
  );
}

// ---------- 3. Documents ----------

export function DocumentQueue({ data }: { data: VerificationQueue }) {
  const me = useAuthStore((s) => s.user);
  const refresh = useQueueRefresh();
  const verify = useMutation({
    mutationFn: ({ projectId, documentId }: { projectId: string; documentId: string }) =>
      projectsService.verifyDocument(projectId, documentId),
    onSuccess: refresh,
  });

  if (data.documents.length === 0) return <Empty text="No documents waiting for verification." />;

  return (
    <div className="space-y-3">
      <ErrorLine error={verify.error} />
      <ul className="space-y-3">
        {data.documents.map(({ document: d, project }) => {
          const own = d.uploadedBy === me?.name;
          return (
            <Item key={d.id}>
              <div>
                <p className="text-sm font-medium text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-500">
                  {PROJECT_DOCUMENT_TYPE_LABELS[d.documentType]}
                  {d.referenceNo && ` · ${d.referenceNo}`}
                  {d.uploadedBy && ` · uploaded by ${d.uploadedBy}`}
                </p>
                <Link to={`/projects/${project.id}`} className="mt-1 block text-xs text-brand-700 hover:underline">
                  {project.projectCode} · {project.title}
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                {d.file ? (
                  <a
                    href={d.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
                  >
                    <Paperclip className="size-3.5" aria-hidden />
                    Open {d.file.fileName}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">File not available</span>
                )}
                <div className="flex items-center gap-2">
                  {own && <span className="text-xs text-slate-400">You uploaded this. Another admin must verify.</span>}
                  <Button
                    size="sm"
                    disabled={own}
                    loading={verify.isPending && verify.variables?.documentId === d.id}
                    onClick={() => verify.mutate({ projectId: project.id, documentId: d.id })}
                  >
                    Mark verified
                  </Button>
                </div>
              </div>
            </Item>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- 4. Budget rows ----------

export function BudgetQueue({ data }: { data: VerificationQueue }) {
  const refresh = useQueueRefresh();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const verify = useMutation({
    mutationFn: ({ projectId, budgetId, sourceDocumentId }: { projectId: string; budgetId: string; sourceDocumentId: string }) =>
      verificationService.verifyBudget(projectId, budgetId, { sourceDocumentId }),
    onSuccess: refresh,
  });

  if (data.budgets.length === 0) return <Empty text="No budget rows waiting for verification." />;

  return (
    <div className="space-y-3">
      <ErrorLine error={verify.error} />
      <ul className="space-y-3">
        {data.budgets.map(({ budget: b, project, verifiedDocuments }) => (
          <Item key={b.id}>
            <div>
              <Link to={`/projects/${project.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                {project.projectCode} · {project.title}
              </Link>
              <p className="text-xs text-slate-500">Fiscal year {b.fiscalYear}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {(
                [
                  ['Approved', b.approvedMinor],
                  ['Revised', b.revisedMinor],
                  ['Released', b.releasedMinor],
                  ['Verified spent', b.spentMinor],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="tabular-nums text-slate-800">
                    <Money minor={value} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
              {verifiedDocuments.length === 0 ? (
                <p className="text-xs text-amber-700">
                  Verify a document for this project first, then link it here as the source.
                </p>
              ) : (
                <>
                  <div className="min-w-56 flex-1">
                    <Select
                      value={chosen[b.id] ?? ''}
                      onChange={(e) => setChosen((s) => ({ ...s, [b.id]: e.target.value }))}
                      aria-label="Source document"
                    >
                      <option value="">Choose the source document</option>
                      {verifiedDocuments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                          {d.referenceNo ? ` (${d.referenceNo})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!chosen[b.id]}
                    loading={verify.isPending && verify.variables?.budgetId === b.id}
                    onClick={() =>
                      verify.mutate({ projectId: project.id, budgetId: b.id, sourceDocumentId: chosen[b.id]! })
                    }
                  >
                    Mark documented
                  </Button>
                </>
              )}
            </div>
          </Item>
        ))}
      </ul>
    </div>
  );
}

// ---------- 5. Overdue citizen replies ----------

export function OverdueQueue({ data }: { data: VerificationQueue }) {
  const refresh = useQueueRefresh();
  const [closing, setClosing] = useState<string | null>(null);
  const close = useMutation({
    mutationFn: (id: string) => verificationService.closeNoResponse(id),
    onSuccess: () => {
      refresh();
      setClosing(null);
    },
  });

  if (data.overdue.length === 0) return <Empty text="No overdue citizen replies." />;

  const closingComplaint = data.overdue.find((c) => c.id === closing);

  return (
    <>
      <ul className="space-y-3">
        {data.overdue.map((c) => {
          const daysLate = Math.max(1, Math.floor((Date.now() - new Date(c.confirmationDueAt!).getTime()) / DAY));
          return (
            <Item key={c.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/complaints/${c.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                  {c.complaintNo}
                </Link>
                <Badge tone="amber">
                  {daysLate} {daysLate === 1 ? 'day' : 'days'} overdue
                </Badge>
              </div>
              <p className="text-sm text-slate-700">
                {CATEGORY_LABELS[c.category]} · {c.location.settlement.name}, {c.location.district}
              </p>
              <p className="text-xs text-slate-500">Reply was due on {formatDate(c.confirmationDueAt!)}</p>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Link
                  to={`/complaints/${c.id}`}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Open complaint
                </Link>
                <Button size="sm" variant="secondary" onClick={() => setClosing(c.id)}>
                  Close as no response
                </Button>
              </div>
            </Item>
          );
        })}
      </ul>

      <Dialog
        open={!!closingComplaint}
        title={closingComplaint ? `Close ${closingComplaint.complaintNo}?` : ''}
        description="It will show as closed without citizen confirmation. It will not be counted as resolved."
        onClose={() => setClosing(null)}
      >
        <div className="space-y-4">
          <ErrorLine error={close.error} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setClosing(null)}>
              Cancel
            </Button>
            <Button loading={close.isPending} onClick={() => closing && close.mutate(closing)}>
              Close as no response
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}