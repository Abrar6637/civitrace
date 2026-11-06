import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info, Pencil } from 'lucide-react';
import { PhotoGallery } from '@/features/projects/PhotoGallery';
import { ProjectHistory } from '@/features/projects/ProjectHistory';
import { ConditionSection } from '@/features/projects/ConditionSection';
import {
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  FUNDING_SOURCE_LABELS,
  formatUnionCouncil,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { formatDate, formatDateTime, formatLength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailField, NotAvailable } from '@/components/ui/detail-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge, VerificationBadge } from '@/features/complaints/ComplaintBadges';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';
import { BudgetSection } from '@/features/projects/BudgetSection';
import { MilestoneList } from '@/features/projects/MilestoneList';
import { DocumentList } from '@/features/projects/DocumentList';
import { InvolvementList } from '@/features/projects/InvolvementList';

const dateOrNA = (value?: string) => (value ? formatDate(value) : <NotAvailable />);

export default function ProjectDetailPage() {
  const { id = '' } = useParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsService.get(id),
    enabled: !!id,
  });

  const backLink = (
    <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      All projects
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="h-8 w-80 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[32rem] animate-pulse rounded-xl bg-slate-100 lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            {notFound ? 'This project was not found, or it is outside your districts.' : 'Could not load this project.'}
          </p>
          {!notFound && (
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { project: p, totals, budgets, milestones, documents, involvements, assets, complaints } = data;
  const loc = p.location;

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
        {backLink}
        <Link
          to={`/projects/${p.id}/edit`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="size-4" aria-hidden />
          Edit
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-brand-700">{p.projectCode}</span>
          <ProjectStatusBadge status={p.status} />
          <VerificationBadge state={p.verification} />
          {p.lastVerifiedAt && (
            <span className="text-xs text-slate-400">Last verified {formatDateTime(p.lastVerifiedAt)}</span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{p.title}</h1>
        <p className="text-sm text-slate-500">
          {loc.settlement.name}, {formatUnionCouncil(loc.unionCouncil)}, {loc.tehsil}, {loc.district}
        </p>
      </div>

      {p.delayReason && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-medium">Status note:</strong> {p.delayReason}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Overview">
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-slate-700">{p.scope}</p>
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Executing department">{p.executingDepartment ?? <NotAvailable />}</DetailField>
                <DetailField label="Contractor">
                  {p.contractor ? (
                    <span className="space-y-1">
                      <span className="block">{p.contractor.name}</span>
                      <span className="block text-xs text-slate-500">
                        {p.contractor.registrationNo ?? 'Registration no. not available'}
                      </span>
                      <VerificationBadge state={p.contractor.verification} />
                    </span>
                  ) : (
                    <NotAvailable />
                  )}
                </DetailField>
                <DetailField label="Funding source">
                  {p.fundingSource ? FUNDING_SOURCE_LABELS[p.fundingSource] : <NotAvailable />}
                </DetailField>
                <DetailField label="Construction type">{p.constructionType ?? <NotAvailable />}</DetailField>
                <DetailField label="Length">{p.lengthM ? formatLength(p.lengthM) : <NotAvailable />}</DetailField>
                <DetailField label="Width">{p.widthM ? `${p.widthM} m` : <NotAvailable />}</DetailField>
              </dl>
            </div>
          </Card>

          <Card title="Schedule and progress">
                      <Card title={`Photos (${data.photos.length})`}>
            <PhotoGallery projectId={p.id} photos={data.photos} />
          </Card>
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Proposed">{dateOrNA(p.proposedAt)}</DetailField>
                <DetailField label="Approved">{dateOrNA(p.approvedAt)}</DetailField>
                <DetailField label="Planned start">{dateOrNA(p.plannedStart)}</DetailField>
                <DetailField label="Planned end">{dateOrNA(p.plannedEnd)}</DetailField>
                <DetailField label="Actual start">{dateOrNA(p.actualStart)}</DetailField>
                <DetailField label="Actual end">{dateOrNA(p.actualEnd)}</DetailField>
              </dl>
              <div className="max-w-md">
                <p className="mb-2 text-xs text-slate-400">Progress (bar = actual, line = planned)</p>
                <ProgressBar actual={p.actualProgressPct} planned={p.plannedProgressPct} />
              </div>
            </div>
          </Card>

          <Card title="Budget">
            <BudgetSection budgets={budgets} totals={totals} />
          </Card>
                    <Card title="Condition after completion">
            <ConditionSection project={p} feedback={data.feedback} />
          </Card>

          <Card title="Milestones">
                        <MilestoneList projectId={p.id} milestones={milestones} />
          </Card>
                    <Card title={`Version history (${data.history.length})`}>
            <ProjectHistory history={data.history} />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card title="Linked assets">
            {assets.length === 0 ? (
              <p className="text-sm text-slate-500">No assets linked.</p>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {assets.map((a) => (
                  <li key={a.id}>
                    <Link to={`/assets/${a.id}`} className="-mx-2 block rounded-lg px-2 py-3 hover:bg-slate-50">
                      <p className="font-mono text-xs font-medium text-brand-700">{a.assetCode}</p>
                      <p className="text-sm text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-500">{ASSET_TYPE_LABELS[a.type]}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Linked complaints (${complaints.length})`}>
            {complaints.length === 0 ? (
              <p className="text-sm text-slate-500">No complaints linked.</p>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {complaints.map((c) => (
                  <li key={c.id}>
                    <Link to={`/complaints/${c.id}`} className="-mx-2 block space-y-1 rounded-lg px-2 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-brand-700">{c.complaintNo}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {CATEGORY_LABELS[c.category]} · {formatDate(c.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Representative involvement">
            <InvolvementList involvements={involvements} documents={documents} />
          </Card>

          <Card title="Documents">
            <DocumentList projectId={p.id} documents={documents} />
          </Card>
        </div>
      </div>
    </div>
  );
}