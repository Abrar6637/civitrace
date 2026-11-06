import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Inbox,
    LoaderCircle,
    Search,
    ThumbsUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    CATEGORY_LABELS,
    COMPLAINT_CATEGORIES,
    COMPLAINT_STATUSES,
    PUNJAB_DIVISIONS,
    SETTLEMENT_TYPE_LABELS,
    STATUS_LABELS,
    formatUnionCouncil,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { useAuthStore } from '@/store/auth.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatAge } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StatusBadge, VerificationBadge } from '@/features/complaints/ComplaintBadges';

const PAGE_SIZE = 15;

type Filters = { status: string; category: string; district: string };

export default function ComplaintsPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Filters>({ status: '', category: '', district: '' });
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(search.trim(), 400);

    const isAreaAdmin = user?.role === 'area_admin';
    const areaDistricts = user?.assignedDistricts ?? [];

    const query = { q, ...filters, page, pageSize: PAGE_SIZE };

    const { data, isLoading, isError, isFetching, refetch } = useQuery({
        queryKey: ['complaints', query],
        queryFn: () => complaintsService.list(query),
        placeholderData: keepPreviousData, // naya page aane tak purana dikhao
    });

    function updateFilter(key: keyof Filters, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
        setPage(1);
    }

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Complaints</h1>
                    <p className="text-sm text-slate-500">
                        {data ? `${total} complaints` : 'Loading…'}
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
                        placeholder="Search number, village, UC, tehsil"
                        aria-label="Search complaints"
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    aria-label="Filter by status"
                >
                    <option value="">All statuses</option>
                    {COMPLAINT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    aria-label="Filter by category"
                >
                    <option value="">All categories</option>
                    {COMPLAINT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                            {CATEGORY_LABELS[c]}
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
                        <p className="text-sm text-slate-600">Could not load complaints.</p>
                        <Button variant="secondary" size="sm" onClick={() => refetch()}>
                            Try again
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Complaint</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Verification</th>
                                    <th className="px-4 py-3 text-right">Support</th>
                                    <th className="px-4 py-3 text-right">Age</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading &&
                                    Array.from({ length: 6 }, (_, i) => (
                                        <tr key={i}>
                                            <td colSpan={7} className="px-4 py-4">
                                                <div className="h-4 animate-pulse rounded bg-slate-100" />
                                            </td>
                                        </tr>
                                    ))}

                                {data?.data.map((c) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => navigate(`/complaints/${c.id}`)}
                                        className="cursor-pointer transition-colors hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/complaints/${c.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="font-mono text-xs font-medium text-brand-700 hover:underline"
                                                >
                                                    {c.complaintNo}
                                                </Link>
                                                {c.isHazard && (
                                                    <AlertTriangle className="size-4 text-red-500" aria-label="Hazard" />
                                                )}
                                                {c.mergedIntoId && <Badge tone="gray">Merged</Badge>}
                                            </div>
                                            <p className="mt-0.5 max-w-xs truncate text-slate-500">{c.description}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{CATEGORY_LABELS[c.category]}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-700">
                                                {c.location.settlement.name}{' '}
                                                <span className="text-xs text-slate-400">
                                                    ({SETTLEMENT_TYPE_LABELS[c.location.settlement.type]})
                                                </span>
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {formatUnionCouncil(c.location.unionCouncil)} · {c.location.tehsil} ·{' '}
                                                {c.location.district}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={c.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <VerificationBadge state={c.verification} />
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            <span className="inline-flex items-center gap-1">
                                                <ThumbsUp className="size-3.5" aria-hidden />
                                                {c.supportCount}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500">
                                            {formatAge(c.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {data && data.data.length === 0 && (
                            <div className="flex flex-col items-center gap-2 p-12 text-center">
                                <Inbox className="size-8 text-slate-300" aria-hidden />
                                <p className="text-sm text-slate-500">No complaints match these filters.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {data && total > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            <span className="font-medium text-slate-700">
                                {from}–{to}
                            </span>{' '}
                            of <span className="font-medium text-slate-700">{total}</span>
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                aria-label="Next page"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}