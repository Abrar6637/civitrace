import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GitCompareArrows, Inbox, LoaderCircle, Search, X } from 'lucide-react';
import {
  FUNDING_SOURCES,
  FUNDING_SOURCE_LABELS,
  MAX_COMPARE,
  MIN_COMPARE,
  PUNJAB_DIVISIONS,
  type AggregateAmount,
} from '@civitrace/shared';
import { budgetsService } from '@/services/budgets.service';
import { useAuthStore } from '@/store/auth.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';

type Filters = { district: string; fiscalYear: string; fundingSource: string };

function TotalTile({ label, value }: { label: string; value?: AggregateAmount }) {
  const total = value ? value.counted + value.missing : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      {value ? (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {value.counted > 0 ? <Money minor={value.sum} /> : <span className="text-slate-400">Not available</span>}
          </p>
          <p className={value.missing > 0 ? 'mt-1 text-xs text-amber-700' : 'mt-1 text-xs text-slate-400'}>
            Based on {value.counted} of {total} projects
            {value.missing > 0 && ` · ${value.missing} missing`}
          </p>
        </>
      ) : (
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-slate-100" />
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ district: '', fiscalYear: '', fundingSource: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const q = useDebouncedValue(search.trim(), 400);

  const isAreaAdmin = user?.role === 'area_admin';
  const areaDistricts = user?.assignedDistricts ?? [];

  const query = { q, ...filters };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['budgets', query],
    queryFn: () => budgetsService.overview(query),
    placeholderData: keepPreviousData,
  });

  const updateFilter = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));
  }

  const codeOf = (id: string) => data?.items.find((p) => p.id === id)?.projectCode ?? id;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Budgets</h1>
          <p className="text-sm text-slate-500">
            Approved, released and verified spending across projects. Select {MIN_COMPARE}–{MAX_COMPARE} projects to
            compare.
          </p>
        </div>
        {isFetching && !isLoading && (
          <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, title, village"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>
        <Select
          value={filters.fiscalYear}
          onChange={(e) => updateFilter('fiscalYear', e.target.value)}
          aria-label="Filter by fiscal year"
        >
          <option value="">All fiscal years</option>
          {data?.fiscalYears.map((fy) => (
            <option key={fy} value={fy}>
              {fy}
            </option>
          ))}
        </Select>
        <Select
          value={filters.fundingSource}
          onChange={(e) => updateFilter('fundingSource', e.target.value)}
          aria-label="Filter by funding source"
        >
          <option value="">All funding sources</option>
          {FUNDING_SOURCES.map((f) => (
            <option key={f} value={f}>
              {FUNDING_SOURCE_LABELS[f]}
            </option>
          ))}
        </Select>
        <Select value={filters.district} onChange={(e) => updateFilter('district', e.target.value)} aria-label="Filter by district">
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

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalTile label="Applicable budget" value={data?.totals.applicable} />
        <TotalTile label="Released" value={data?.totals.released} />
        <TotalTile label="Verified expenditure" value={data?.totals.spent} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-slate-600">Could not load budgets.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Applicable</th>
                  <th className="px-4 py-3 text-right">Released</th>
                  <th className="px-4 py-3 text-right">Verified spent</th>
                  <th className="px-4 py-3 text-right">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {isLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {data?.items.map((p) => {
                  const checked = selected.includes(p.id);
                  const disabled = !checked && selected.length >= MAX_COMPARE;
                  return (
                    <tr key={p.id} className={checked ? 'bg-brand-50/50' : undefined}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(p.id)}
                          aria-label={`Select ${p.projectCode} for comparison`}
                          className="size-4 accent-brand-600 disabled:opacity-40"
                        />
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <Link to={`/projects/${p.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                          {p.projectCode}
                        </Link>
                        <p className="truncate text-slate-700">{p.title}</p>
                        <p className="text-xs text-slate-400">
                          {p.location.district}
                          {p.fundingSource && ` · ${FUNDING_SOURCE_LABELS[p.fundingSource]}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right"><Money minor={p.totals.applicable} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right"><Money minor={p.totals.released} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right"><Money minor={p.totals.spent} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {p.totals.utilizationPct !== undefined ? (
                          `${p.totals.utilizationPct}%`
                        ) : (
                          <span className="text-slate-400">Not available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data && data.items.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">No projects with budgets match these filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compare bar */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">
                {selected.length} of {MAX_COMPARE} selected:
              </span>
              {selected.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 font-mono text-xs text-brand-700"
                >
                  {codeOf(id)}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={`Remove ${codeOf(id)}`}
                    className="rounded-full p-0.5 hover:bg-brand-100"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
              <Button
                size="sm"
                disabled={selected.length < MIN_COMPARE}
                onClick={() => navigate(`/budgets/compare?ids=${selected.join(',')}`)}
              >
                <GitCompareArrows className="size-4" aria-hidden />
                Compare
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}