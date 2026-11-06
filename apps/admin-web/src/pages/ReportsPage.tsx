import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Info, LoaderCircle, Printer } from 'lucide-react';
import {
  CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  PUNJAB_DIVISIONS,
  formatRupees,
  getDivisionOf,
  type AggregateAmount,
} from '@civitrace/shared';
import { reportsService } from '@/services/reports.service';
import { useAuthStore } from '@/store/auth.store';
import { downloadCsv } from '@/lib/csv';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Select } from '@/components/ui/select';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';
import { ConditionScore } from '@/features/feedback/ConditionScore';

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 print:border-slate-400">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const basedOn = (a: AggregateAmount) => `Based on ${a.counted} of ${a.counted + a.missing} projects`;
const NA = <span className="text-slate-400">Not available</span>;

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAreaAdmin = user?.role === 'area_admin';
  const areaDistricts = user?.assignedDistricts ?? [];

  const [from, setFrom] = useState(() => isoDay(Date.now() - 90 * DAY));
  const [to, setTo] = useState(() => isoDay(Date.now()));
  const [district, setDistrict] = useState('');

  const datesInvalid = !!from && !!to && from > to;
  const query = { from, to, district };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['reports', query],
    queryFn: () => reportsService.summary(query),
    placeholderData: keepPreviousData,
    enabled: !datesInvalid,
  });

  function exportCsv() {
    if (!data) return;
    const c = data.complaints;
    const money = (a: AggregateAmount) => (a.counted > 0 ? formatRupees(a.sum) : 'Not available');
    const rows: string[][] = [
      ['Civitrace report'],
      ['Period', `${from} to ${to}`],
      ['District', district || 'All in scope'],
      [],
      ['Complaints received in the period'],
      ['Received', 'Open', 'Resolved (citizen confirmed)', 'Closed, no reply', 'Rejected', 'Merged', 'Median days to resolve'],
      [c.received, c.open, c.resolvedConfirmed, c.closedNoResponse, c.rejected, c.merged, c.medianDaysToResolve ?? 'Not available'].map(String),
      [],
      ['By category'],
      ['Category', 'Received', 'Open', 'Resolved (citizen confirmed)'],
      ...data.byCategory.map((r) => [CATEGORY_LABELS[r.category], r.received, r.open, r.resolvedConfirmed].map(String)),
      [],
      ['By district (alphabetical, not a ranking)'],
      ['District', 'Division', 'Received', 'Open', 'Resolved (citizen confirmed)', 'Median days to resolve'],
      ...data.byDistrict.map((r) =>
        [r.district, getDivisionOf(r.district) ?? '', r.received, r.open, r.resolvedConfirmed, r.medianDaysToResolve ?? 'Not available'].map(String)
      ),
      [],
      ['Projects in scope'],
      ['Total', 'Applicable budget', 'Verified expenditure', 'Accepted condition feedback', 'Average condition (1-5)'],
      [
        String(data.projects.total),
        money(data.projects.applicable),
        money(data.projects.spent),
        String(data.projects.acceptedFeedback),
        data.projects.averageCondition !== undefined ? String(data.projects.averageCondition) : 'Not available',
      ],
    ];
    downloadCsv(`civitrace-report-${from}-to-${to}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            {from && to ? `${formatDate(from)} to ${formatDate(to)}` : 'Choose a period'}
            {district ? ` · ${district}` : isAreaAdmin ? ` · ${areaDistricts.join(', ')}` : ' · All districts'}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {isFetching && !isLoading && (
            <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
          )}
          <Button variant="secondary" size="sm" disabled={!data} onClick={exportCsv}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" disabled={!data} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 print:hidden">
        <FormField label="From" htmlFor="r-from">
          <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
        <FormField label="To" htmlFor="r-to" error={datesInvalid ? 'The end date is before the start date' : undefined}>
          <Input id="r-to" type="date" value={to} invalid={datesInvalid} onChange={(e) => setTo(e.target.value)} />
        </FormField>
        <FormField label="District" htmlFor="r-district">
          <Select id="r-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
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
        </FormField>
      </div>

      {isLoading && <div className="h-96 animate-pulse rounded-xl bg-slate-100" />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">Could not load the report.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && (
        <>
          {/* Complaints */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Complaints received in this period</h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Received" value={data.complaints.received} />
              <Tile label="Still open" value={data.complaints.open} />
              <Tile label="Resolved" value={data.complaints.resolvedConfirmed} hint="Confirmed by the citizen" />
              <Tile label="Closed, no reply" value={data.complaints.closedNoResponse} hint="Not counted as resolved" />
              <Tile label="Rejected" value={data.complaints.rejected} />
              <Tile
                label="Median days to resolve"
                value={data.complaints.medianDaysToResolve ?? NA}
                hint={`${data.complaints.merged} merged as duplicates`}
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="By category">
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-slate-500">No complaints in this period.</p>
              ) : (
                <div className="-mx-5 -my-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3 text-right">Received</th>
                        <th className="px-5 py-3 text-right">Open</th>
                        <th className="px-5 py-3 text-right">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {data.byCategory.map((r) => (
                        <tr key={r.category}>
                          <td className="px-5 py-2.5 text-slate-800">{CATEGORY_LABELS[r.category]}</td>
                          <td className="px-5 py-2.5 text-right">{r.received}</td>
                          <td className="px-5 py-2.5 text-right">{r.open}</td>
                          <td className="px-5 py-2.5 text-right">{r.resolvedConfirmed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="By district">
              {data.byDistrict.length === 0 ? (
                <p className="text-sm text-slate-500">No data in this period.</p>
              ) : (
                <div className="-mx-5 -my-5 overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">District</th>
                        <th className="px-5 py-3 text-right">Received</th>
                        <th className="px-5 py-3 text-right">Open</th>
                        <th className="px-5 py-3 text-right">Resolved</th>
                        <th className="px-5 py-3 text-right">Median days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {data.byDistrict.map((r) => (
                        <tr key={r.district}>
                          <td className="px-5 py-2.5">
                            <span className="text-slate-800">{r.district}</span>
                            <span className="block text-xs text-slate-400">{getDivisionOf(r.district)}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right">{r.received}</td>
                          <td className="px-5 py-2.5 text-right">{r.open}</td>
                          <td className="px-5 py-2.5 text-right">{r.resolvedConfirmed}</td>
                          <td className="px-5 py-2.5 text-right">{r.medianDaysToResolve ?? NA}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Projects */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Projects in scope</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Projects" value={data.projects.total} />
              <Tile
                label="Applicable budget"
                value={data.projects.applicable.counted > 0 ? <Money minor={data.projects.applicable.sum} /> : NA}
                hint={basedOn(data.projects.applicable)}
              />
              <Tile
                label="Verified expenditure"
                value={data.projects.spent.counted > 0 ? <Money minor={data.projects.spent.sum} /> : NA}
                hint={basedOn(data.projects.spent)}
              />
              <Tile
                label="Condition feedback"
                value={
                  data.projects.averageCondition !== undefined ? (
                    <ConditionScore score={data.projects.averageCondition} />
                  ) : (
                    NA
                  )
                }
                hint={`${data.projects.acceptedFeedback} accepted reports in this period`}
              />
            </div>
            {data.projects.byStatus.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.projects.byStatus.map((s) => (
                  <span key={s.status} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                    <ProjectStatusBadge status={s.status} />
                    <span className="tabular-nums">{s.count}</span>
                    <span className="sr-only">{PROJECT_STATUS_LABELS[s.status]}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
            <p>
              Districts are listed alphabetically. Numbers depend on population, area and how many people use Civitrace,
              so they are not a ranking of districts, departments or representatives. Projects are counted regardless of
              the date filter.
            </p>
          </div>
        </>
      )}
    </div>
  );
}