import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Inbox,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/features/dashboard/StatCard';
import { WeeklyTrendChart } from '@/features/dashboard/WeeklyTrendChart';
import { AgingChart } from '@/features/dashboard/AgingChart';
import { CategoryChart } from '@/features/dashboard/CategoryChart';
import { NeedsAttentionList } from '@/features/dashboard/NeedsAttentionList';
import { DistrictTable } from '@/features/dashboard/DistrictTable';

function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.summary,
  });

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back, {user?.name}
            {user?.role === 'area_admin' && user.assignedDistricts && ` · ${user.assignedDistricts.join(', ')}`}
          </p>
        </div>
        {isFetching && !isLoading && (
          <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
        )}
      </div>

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Could not load dashboard data.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="New complaints" value={k?.newLast7Days} hint="Last 7 days" icon={Inbox} tone="bg-sky-50 text-sky-600" />
        <StatCard label="Pending review" value={k?.pendingReview} hint="Submitted or under review" icon={Clock} tone="bg-amber-50 text-amber-600" />
        <StatCard label="Awaiting confirmation" value={k?.awaitingConfirmation} hint="Waiting for citizen reply" icon={Hourglass} tone="bg-violet-50 text-violet-600" />
        <StatCard label="Open hazards" value={k?.openHazards} hint="Safety risk, not yet resolved" icon={AlertTriangle} tone="bg-red-50 text-red-600" />
        <StatCard label="Resolved" value={k?.resolvedLast30Days} hint="Confirmed by citizens, last 30 days" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
        <StatCard label="Reopened" value={k?.reopened} hint="Citizen said it was not fixed" icon={RotateCcw} tone="bg-orange-50 text-orange-600" />
      </div>

      {/* Trend + aging */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Complaints per week" className="lg:col-span-2">
          {data ? <WeeklyTrendChart data={data.weekly} /> : <ChartSkeleton />}
        </Card>
        <Card title="Open complaints by age">
          {data ? <AgingChart data={data.aging} /> : <ChartSkeleton />}
        </Card>
      </div>

      {/* Category + needs attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By category">
          {data ? <CategoryChart data={data.byCategory} /> : <ChartSkeleton />}
        </Card>
        <Card title="Needs attention">
          {data ? <NeedsAttentionList items={data.needsAttention} /> : <ChartSkeleton />}
        </Card>
      </div>

      {/* Districts */}
      <Card title="By district">
        {data ? <DistrictTable rows={data.byDistrict} /> : <ChartSkeleton />}
      </Card>
    </div>
  );
}