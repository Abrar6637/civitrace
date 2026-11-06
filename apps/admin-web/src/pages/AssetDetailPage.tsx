import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';
import {
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  REPEAT_ISSUE_WINDOW_YEARS,
  SETTLEMENT_TYPE_LABELS,
  getDivisionOf,
} from '@civitrace/shared';
import { assetsService } from '@/services/assets.service';
import { ApiError } from '@/services/api';
import { formatDate, formatLength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailField, NotAvailable } from '@/components/ui/detail-field';
import { StatusBadge, VerificationBadge } from '@/features/complaints/ComplaintBadges';
import { LocationMap } from '@/features/complaints/LocationMap';
import { ConditionBadge, RepeatIssueBadge } from '@/features/assets/AssetBadges';

export default function AssetDetailPage() {
  const { id = '' } = useParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsService.get(id),
    enabled: !!id,
  });

  const backLink = (
    <Link to="/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      All assets
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-xl bg-slate-100 lg:col-span-2" />
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
            {notFound ? 'This asset was not found, or it is outside your districts.' : 'Could not load this asset.'}
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

    const { asset: a, complaints, projects } = data;
  const loc = a.location;

  return (
    <div className="space-y-6">
      {backLink}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-brand-700">{a.assetCode}</span>
          <ConditionBadge condition={a.condition} />
          <VerificationBadge state={a.verification} />
          {a.repeatIssue && <RepeatIssueBadge />}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{a.name}</h1>
        <p className="text-sm text-slate-500">
          {ASSET_TYPE_LABELS[a.type]} · {loc.settlement.name}, {loc.district}
        </p>
      </div>

      {a.repeatIssue && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            New complaints were reported within {REPEAT_ISSUE_WINDOW_YEARS} years of the last recorded work
            ({a.lastWorkYear}). This is shown for tracking only and is not a finding of fault.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-4 sm:grid-cols-3">
              <DetailField label="Type">{ASSET_TYPE_LABELS[a.type]}</DetailField>
              <DetailField label="Length">{a.lengthM ? formatLength(a.lengthM) : <NotAvailable />}</DetailField>
              <DetailField label="Built">{a.builtYear ?? <NotAvailable />}</DetailField>
              <DetailField label="Last recorded work">{a.lastWorkYear ?? <NotAvailable />}</DetailField>
              <DetailField label="Responsible department">{a.ownerDepartment ?? <NotAvailable />}</DetailField>
              <DetailField label="Record since">{formatDate(a.createdAt)}</DetailField>
            </dl>
          </Card>

          <Card title="Location">
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Province">{loc.province}</DetailField>
                <DetailField label="Division">{getDivisionOf(loc.district) ?? <NotAvailable />}</DetailField>
                <DetailField label="District">{loc.district}</DetailField>
                <DetailField label="Tehsil">{loc.tehsil}</DetailField>
                <DetailField label="Union Council no.">{loc.unionCouncil.number ?? <NotAvailable />}</DetailField>
                <DetailField label="Union Council name">{loc.unionCouncil.name ?? <NotAvailable />}</DetailField>
                <DetailField label={SETTLEMENT_TYPE_LABELS[loc.settlement.type]}>{loc.settlement.name}</DetailField>
              </dl>
              {a.point && <LocationMap point={a.point} />}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
                      <Card title={`Projects (${projects.length})`}>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects recorded for this asset.</p>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/projects/${p.id}`}
                      className="-mx-2 block space-y-1 rounded-lg px-2 py-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-brand-700">{p.projectCode}</span>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <p className="text-sm text-slate-700">{p.title}</p>
                      <p className="text-xs text-slate-400">
                        {p.actualEnd ? `Completed ${formatDate(p.actualEnd)}` : p.approvedAt ? `Approved ${formatDate(p.approvedAt)}` : 'Not yet approved'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Complaint history">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Open</p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{a.openComplaints}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{a.totalComplaints}</p>
                </div>
              </div>

              {complaints.length === 0 ? (
                <p className="text-sm text-slate-500">No complaints linked yet.</p>
              ) : (
                <ul className="-my-2 divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/complaints/${c.id}`}
                        className="-mx-2 block space-y-1 rounded-lg px-2 py-3 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-medium text-brand-700">{c.complaintNo}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-sm text-slate-700">{CATEGORY_LABELS[c.category]}</p>
                        <p className="truncate text-xs text-slate-500">{c.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(c.createdAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}