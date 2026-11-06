import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ChevronRight, Download, Inbox, Info, LoaderCircle, Search } from 'lucide-react';
import type { AuditEntityType, AuditEntry } from '@civitrace/shared';
import { auditService } from '@/services/audit.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { downloadCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';

const PAGE_SIZE = 25;

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  user: 'User',
  complaint: 'Complaint',
  asset: 'Asset',
  project: 'Project',
};

const ENTITY_TONES: Record<AuditEntityType, BadgeTone> = {
  user: 'violet',
  complaint: 'blue',
  asset: 'teal',
  project: 'amber',
};

// "complaint.status_changed" → "Status changed"
function actionLabel(action: string) {
  const verb = action.split('.')[1] ?? action;
  const text = verb.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const linkFor = (e: AuditEntry) => (e.entityType === 'user' ? '/users' : `/${e.entityType}s/${e.entityId}`);

type Filters = { entityType: string; actorId: string; from: string; to: string };

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ entityType: '', actorId: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const q = useDebouncedValue(search.trim(), 400);

  const query = { q, ...filters, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['audit', query],
    queryFn: () => auditService.list(query),
    placeholderData: keepPreviousData,
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const toggle = (id: string) =>
    setExpanded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const datesInvalid = !!filters.from && !!filters.to && filters.from > filters.to;

  // Export everything that matches the filters, not just this page
  const exportCsv = useMutation({
    mutationFn: () => auditService.list({ q, ...filters, page: 1, pageSize: 1000 }),
    onSuccess: (res) => {
      const rows = res.data.map((e) => [
        formatDateTime(e.at),
        e.actorName,
        `${e.entityType}.${actionLabel(e.action).toLowerCase()}`,
        ENTITY_LABELS[e.entityType],
        e.entityLabel,
        e.summary,
        (e.changes ?? []).map((c) => `${c.field}: ${c.before ?? '—'} → ${c.after ?? 'Removed'}`).join('; '),
      ]);
      downloadCsv(`civitrace-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Time', 'Actor', 'Action', 'Record type', 'Record', 'Summary', 'Changes'],
        ...rows,
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} entries` : 'Loading…'} · Every admin action, newest first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={exportCsv.isPending}
            disabled={!data || data.total === 0}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search record, summary, person"
              aria-label="Search the audit log"
              className="pl-9"
            />
          </div>
          <Select
            value={filters.entityType}
            onChange={(e) => updateFilter('entityType', e.target.value)}
            aria-label="Filter by record type"
          >
            <option value="">All record types</option>
            {(Object.keys(ENTITY_LABELS) as AuditEntityType[]).map((t) => (
              <option key={t} value={t}>
                {ENTITY_LABELS[t]}
              </option>
            ))}
          </Select>
          <Select
            value={filters.actorId}
            onChange={(e) => updateFilter('actorId', e.target.value)}
            aria-label="Filter by person"
          >
            <option value="">Everyone</option>
            {data?.actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <FormField label="From" htmlFor="audit-from">
            <Input id="audit-from" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          </FormField>
          <FormField
            label="To"
            htmlFor="audit-to"
            error={datesInvalid ? 'The end date is before the start date' : undefined}
          >
            <Input
              id="audit-to"
              type="date"
              value={filters.to}
              invalid={datesInvalid}
              onChange={(e) => updateFilter('to', e.target.value)}
            />
          </FormField>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-slate-600">Could not load the audit log.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {data?.data.map((e) => {
                  const hasChanges = !!e.changes && e.changes.length > 0;
                  const open = expanded.includes(e.id);
                  return (
                    <Fragment key={e.id}>
                      <tr className={open ? 'bg-slate-50' : undefined}>
                        <td className="px-2 py-3">
                          {hasChanges && (
                            <button
                              type="button"
                              onClick={() => toggle(e.id)}
                              aria-expanded={open}
                              aria-label={open ? 'Hide changes' : 'Show changes'}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(e.at)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-800">{e.actorName}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge tone={ENTITY_TONES[e.entityType]}>{ENTITY_LABELS[e.entityType]}</Badge>
                            <span className="text-slate-700">{actionLabel(e.action)}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link to={linkFor(e)} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                            {e.entityLabel}
                          </Link>
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-600">
                          <p className="line-clamp-2">{e.summary}</p>
                        </td>
                      </tr>

                      {open && hasChanges && (
                        <tr className="bg-slate-50">
                          <td />
                          <td colSpan={5} className="px-4 pb-4">
                            <table className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
                              <thead className="bg-slate-50 text-left font-medium text-slate-500">
                                <tr>
                                  <th className="px-3 py-2">Field</th>
                                  <th className="px-3 py-2">Before</th>
                                  <th className="px-3 py-2">After</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {e.changes!.map((c) => (
                                  <tr key={c.field}>
                                    <td className="px-3 py-2 font-medium text-slate-700">{c.field}</td>
                                    <td className="px-3 py-2 text-slate-400 line-through">{c.before ?? '—'}</td>
                                    <td className="px-3 py-2 text-slate-800">{c.after ?? 'Removed'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {data && data.data.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">No entries match these filters.</p>
              </div>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </div>

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
        <p>The audit log is append-only. Entries cannot be edited or deleted, by anyone.</p>
      </div>
    </div>
  );
}