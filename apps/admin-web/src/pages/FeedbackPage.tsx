import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Camera, Inbox, LoaderCircle } from 'lucide-react';
import {
  CONFIRMATION_MAX_DISTANCE_M,
  DAMAGE_TYPE_LABELS,
  FEEDBACK_DISCLAIMER,
  FEEDBACK_REVIEW_STATUS_LABELS,
  PUNJAB_DIVISIONS,
  REVIEW_PERIODS,
  REVIEW_PERIOD_LABELS,
  type FeedbackReviewStatus,
} from '@civitrace/shared';
import { feedbackService } from '@/services/feedback.service';
import { useAuthStore } from '@/store/auth.store';
import { formatDate, formatLength } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { ConditionScore } from '@/features/feedback/ConditionScore';
import { FeedbackReviewDialog, type ReviewTarget } from '@/features/feedback/FeedbackReviewDialog';

const PAGE_SIZE = 15;

const STATUS_TONES: Record<FeedbackReviewStatus, BadgeTone> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'gray',
};

type StatusFilter = FeedbackReviewStatus | '';

export default function FeedbackPage() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [period, setPeriod] = useState('');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<ReviewTarget | null>(null);

  const isAreaAdmin = user?.role === 'area_admin';
  const areaDistricts = user?.assignedDistricts ?? [];

  const query = { status, period, district, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['feedback', query],
    queryFn: () => feedbackService.list(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Condition feedback</h1>
          <p className="text-sm text-slate-500">Citizen reports on completed works at 3, 6 and 12 months, and damage reports.</p>
        </div>
        {isFetching && !isLoading && (
          <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="inline-flex rounded-lg border border-slate-200 p-1">
          {(
            [
              ['pending', 'Waiting'],
              ['accepted', 'Accepted'],
              ['rejected', 'Not accepted'],
              ['', 'All'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              aria-pressed={status === value}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                status === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="w-44">
          <Select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by period"
          >
            <option value="">All periods</option>
            {REVIEW_PERIODS.map((p) => (
              <option key={p} value={p}>
                {REVIEW_PERIOD_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by district"
          >
            <option value="">All districts</option>
            {isAreaAdmin
              ? areaDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))
              : PUNJAB_DIVISIONS.map((div) => (
                  <optgroup key={div.name} label={`${div.name} Division`}>
                    {div.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">Could not load feedback.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Inbox className="size-8 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-500">No feedback matches these filters.</p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {data.data.map((f) => {
              const tooFar = (f.distanceFromAssetM ?? 0) > CONFIRMATION_MAX_DISTANCE_M;
              return (
                <li key={f.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={f.reviewPeriod === 'ad_hoc' ? 'red' : 'blue'}>{REVIEW_PERIOD_LABELS[f.reviewPeriod]}</Badge>
                    <Badge tone={STATUS_TONES[f.reviewStatus]}>{FEEDBACK_REVIEW_STATUS_LABELS[f.reviewStatus]}</Badge>
                    <span className="ml-auto text-xs text-slate-400">{formatDate(f.submittedAt)}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0 space-y-1">
                      <Link to={`/assets/${f.asset.id}`} className="block text-sm font-medium text-slate-900 hover:underline">
                        <span className="font-mono text-xs text-brand-700">{f.asset.assetCode}</span> · {f.asset.name}
                      </Link>
                      {f.project && (
                        <Link to={`/projects/${f.project.id}`} className="block truncate text-xs text-brand-700 hover:underline">
                          {f.project.projectCode} · {f.project.title}
                        </Link>
                      )}
                      <p className="text-xs text-slate-500">
                        {f.asset.location.settlement.name}, {f.asset.location.tehsil}, {f.asset.location.district}
                      </p>
                    </div>
                    <ConditionScore score={f.conditionScore} />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {f.damageTypes.map((t) => (
                      <Badge key={t} tone={t === 'none' ? 'green' : 'gray'}>
                        {DAMAGE_TYPE_LABELS[t]}
                      </Badge>
                    ))}
                  </div>

                  {f.narrative && <p className="text-sm text-slate-700">"{f.narrative}"</p>}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>By {f.reporterName}</span>
                    <span className="inline-flex items-center gap-1">
                      <Camera className="size-3.5" aria-hidden />
                      {f.evidenceIds.length} live {f.evidenceIds.length === 1 ? 'photo' : 'photos'}
                    </span>
                    {f.distanceFromAssetM !== undefined && (
                      <span className={cn('inline-flex items-center gap-1', tooFar && 'font-medium text-amber-700')}>
                        {tooFar && <AlertTriangle className="size-3.5" aria-hidden />}
                        {formatLength(f.distanceFromAssetM)} from the asset
                      </span>
                    )}
                  </div>

                  {f.reviewStatus === 'pending' ? (
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setTarget({ item: f, decision: 'rejected' })}>
                        Do not accept
                      </Button>
                      <Button size="sm" onClick={() => setTarget({ item: f, decision: 'accepted' })}>
                        Accept
                      </Button>
                    </div>
                  ) : (
                    <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                      {FEEDBACK_REVIEW_STATUS_LABELS[f.reviewStatus]} by {f.reviewedBy}
                      {f.reviewedAt && ` on ${formatDate(f.reviewedAt)}`}
                      {f.reviewNote && `: ${f.reviewNote}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <p className="text-xs text-slate-400">{FEEDBACK_DISCLAIMER}</p>

      <FeedbackReviewDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}