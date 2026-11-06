import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox, LoaderCircle, Plus, Search } from 'lucide-react';
import {
  FUNDING_SOURCES,
  FUNDING_SOURCE_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PUNJAB_DIVISIONS,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { useAuthStore } from '@/store/auth.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';

const PAGE_SIZE = 15;

type Filters = { status: string; fundingSource: string; district: string };

export default function ProjectsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ status: '', fundingSource: '', district: '' });
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 400);

  const isAreaAdmin = user?.role === 'area_admin';
  const areaDistricts = user?.assignedDistricts ?? [];

  const query = { q, ...filters, page, pageSize: PAGE_SIZE };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['projects', query],
    queryFn: () => projectsService.list(query),
    placeholderData: keepPreviousData,
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} development projects` : 'Loading…'}
            {isAreaAdmin && ` in ${areaDistricts.join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
          )}
          <Link
            to="/projects/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden />
            New project
          </Link>
        </div>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, title, village, contractor"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-slate-600">Could not load projects.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Verified spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {data?.data.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        to={`/projects/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs font-medium text-brand-700 hover:underline"
                      >
                        {p.projectCode}
                      </Link>
                      <p className="mt-0.5 truncate text-slate-700">{p.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{p.location.settlement.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.location.tehsil} · {p.location.district}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar actual={p.actualProgressPct} planned={p.plannedProgressPct} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      <Money minor={p.totals.applicable} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      <Money minor={p.totals.spent} />
                      {p.totals.utilizationPct !== undefined && (
                        <p className="text-xs text-slate-400">{p.totals.utilizationPct}% used</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.data.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">No projects match these filters.</p>
              </div>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}