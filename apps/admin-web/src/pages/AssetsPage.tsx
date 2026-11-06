import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox, LoaderCircle, Search } from 'lucide-react';
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  PUNJAB_DIVISIONS,
  SETTLEMENT_TYPE_LABELS,
  formatUnionCouncil,
} from '@civitrace/shared';
import { assetsService } from '@/services/assets.service';
import { useAuthStore } from '@/store/auth.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ConditionBadge, RepeatIssueBadge } from '@/features/assets/AssetBadges';

const PAGE_SIZE = 15;

type Filters = { type: string; condition: string; district: string };

export default function AssetsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ type: '', condition: '', district: '' });
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 400);

  const isAreaAdmin = user?.role === 'area_admin';
  const areaDistricts = user?.assignedDistricts ?? [];

  const query = { q, ...filters, page, pageSize: PAGE_SIZE };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['assets', query],
    queryFn: () => assetsService.list(query),
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
          <h1 className="text-2xl font-semibold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} infrastructure records` : 'Loading…'}
            {isAreaAdmin && ` in ${areaDistricts.join(', ')}`}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, name, village, UC"
            aria-label="Search assets"
            className="pl-9"
          />
        </div>
        <Select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.condition}
          onChange={(e) => updateFilter('condition', e.target.value)}
          aria-label="Filter by condition"
        >
          <option value="">All conditions</option>
          {ASSET_CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {ASSET_CONDITION_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.district}
          onChange={(e) => updateFilter('district', e.target.value)}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-slate-600">Could not load assets.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Open / total</th>
                  <th className="px-4 py-3 text-right">Last work</th>
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

                {data?.data.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/assets/${a.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/assets/${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs font-medium text-brand-700 hover:underline"
                      >
                        {a.assetCode}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-slate-700">{a.name}</span>
                        {a.repeatIssue && <RepeatIssueBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ASSET_TYPE_LABELS[a.type]}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">
                        {a.location.settlement.name}{' '}
                        <span className="text-xs text-slate-400">
                          ({SETTLEMENT_TYPE_LABELS[a.location.settlement.type]})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatUnionCouncil(a.location.unionCouncil)} · {a.location.tehsil} ·{' '}
                        {a.location.district}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ConditionBadge condition={a.condition} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      <span className={a.openComplaints > 0 ? 'font-medium text-slate-900' : ''}>
                        {a.openComplaints}
                      </span>{' '}
                      / {a.totalComplaints}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {a.lastWorkYear ?? <span className="text-slate-400">Not available</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.data.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">No assets match these filters.</p>
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