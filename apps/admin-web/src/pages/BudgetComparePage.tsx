import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Download, Info } from 'lucide-react';
import {
  ASSET_TYPE_LABELS,
  COMPARISON_DISCLAIMER,
  FUNDING_SOURCE_LABELS,
  MAX_COMPARE,
  MIN_COMPARE,
  PROJECT_STATUS_LABELS,
  UNIT_LABELS,
  VERIFICATION_LABELS,
  compareProjects,
  formatRupees,
  type ComparisonRow,
  type ProjectCompareItem,
} from '@civitrace/shared';
import { budgetsService } from '@/services/budgets.service';
import { ApiError } from '@/services/api';
import { downloadCsv } from '@/lib/csv';
import { formatLength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { NotAvailable } from '@/components/ui/detail-field';
import { ProjectStatusBadge } from '@/features/projects/ProjectBadges';
import { VerificationBadge } from '@/features/complaints/ComplaintBadges';

const NA = 'Not available';
const csvMoney = (m?: number) => (m === undefined ? NA : formatRupees(m));

type RowDef = {
  label: string;
  cell: (item: ProjectCompareItem, row: ComparisonRow) => ReactNode;
  csv: (item: ProjectCompareItem, row: ComparisonRow) => string;
};

export default function BudgetComparePage() {
  const [params] = useSearchParams();
  const ids = [...new Set((params.get('ids') ?? '').split(',').filter(Boolean))];
  const validCount = ids.length >= MIN_COMPARE && ids.length <= MAX_COMPARE;

  const { data, isLoading, error } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => budgetsService.compare(ids),
    enabled: validCount,
  });

  const backLink = (
    <Link to="/budgets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden />
      Budgets
    </Link>
  );

  if (!validCount) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="text-sm text-slate-600">
          Choose {MIN_COMPARE} to {MAX_COMPARE} projects on the Budgets page to compare them.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="text-sm text-red-600">
          {error instanceof ApiError ? error.message : 'Could not load the comparison.'}
        </p>
      </div>
    );
  }

  const { items } = data;
  const result = compareProjects(items);
  const unit = UNIT_LABELS[result.basis];
  const rowOf = (id: string) => result.rows.find((r) => r.projectId === id)!;

  const rows: RowDef[] = [
    {
      label: 'Status',
      cell: ({ project }) => <ProjectStatusBadge status={project.status} />,
      csv: ({ project }) => PROJECT_STATUS_LABELS[project.status],
    },
    {
      label: 'Location',
      cell: ({ project: p }) => `${p.location.settlement.name}, ${p.location.tehsil}, ${p.location.district}`,
      csv: ({ project: p }) => `${p.location.settlement.name}, ${p.location.tehsil}, ${p.location.district}`,
    },
    {
      label: 'Asset type',
      cell: ({ assetTypes }) => assetTypes.map((t) => ASSET_TYPE_LABELS[t]).join(', ') || <NotAvailable />,
      csv: ({ assetTypes }) => assetTypes.map((t) => ASSET_TYPE_LABELS[t]).join(', ') || NA,
    },
    {
      label: 'Construction type',
      cell: ({ project }) => project.constructionType ?? <NotAvailable />,
      csv: ({ project }) => project.constructionType ?? NA,
    },
    {
      label: 'Length',
      cell: ({ project }) => (project.lengthM ? formatLength(project.lengthM) : <NotAvailable />),
      csv: ({ project }) => (project.lengthM ? `${project.lengthM} m` : NA),
    },
    {
      label: 'Width',
      cell: ({ project }) => (project.widthM ? `${project.widthM} m` : <NotAvailable />),
      csv: ({ project }) => (project.widthM ? `${project.widthM} m` : NA),
    },
    {
      label: 'Fiscal years',
      cell: ({ fiscalYears }) => fiscalYears.join(', ') || <NotAvailable />,
      csv: ({ fiscalYears }) => fiscalYears.join(', ') || NA,
    },
    {
      label: 'Original approved',
      cell: ({ totals }) => <Money minor={totals.approved} />,
      csv: ({ totals }) => csvMoney(totals.approved),
    },
    {
      label: 'Applicable budget',
      cell: ({ totals }) => (
        <span>
          <Money minor={totals.applicable} />
          {totals.hasRevision && <span className="block text-xs text-slate-400">Includes revisions</span>}
        </span>
      ),
      csv: ({ totals }) => csvMoney(totals.applicable),
    },
    {
      label: 'Released',
      cell: ({ totals }) => <Money minor={totals.released} />,
      csv: ({ totals }) => csvMoney(totals.released),
    },
    {
      label: 'Verified expenditure',
      cell: ({ totals }) => <Money minor={totals.spent} />,
      csv: ({ totals }) => csvMoney(totals.spent),
    },
    {
      label: 'Utilization',
      cell: ({ totals }) => (totals.utilizationPct !== undefined ? `${totals.utilizationPct}%` : <NotAvailable />),
      csv: ({ totals }) => (totals.utilizationPct !== undefined ? `${totals.utilizationPct}%` : NA),
    },
    ...(result.basis !== 'none'
      ? [
          {
            label: `Budget ${unit}`,
            cell: (_: ProjectCompareItem, r: ComparisonRow) => <Money minor={r.budgetPerUnit} />,
            csv: (_: ProjectCompareItem, r: ComparisonRow) => csvMoney(r.budgetPerUnit),
          },
          {
            label: `Spent ${unit} (completed only)`,
            cell: (_: ProjectCompareItem, r: ComparisonRow) => <Money minor={r.spentPerUnit} />,
            csv: (_: ProjectCompareItem, r: ComparisonRow) => csvMoney(r.spentPerUnit),
          },
        ]
      : []),
    {
      label: 'Executing department',
      cell: ({ project }) => project.executingDepartment ?? <NotAvailable />,
      csv: ({ project }) => project.executingDepartment ?? NA,
    },
    {
      label: 'Contractor',
      cell: ({ project }) => project.contractor?.name ?? <NotAvailable />,
      csv: ({ project }) => project.contractor?.name ?? NA,
    },
    {
      label: 'Funding source',
      cell: ({ project }) => (project.fundingSource ? FUNDING_SOURCE_LABELS[project.fundingSource] : <NotAvailable />),
      csv: ({ project }) => (project.fundingSource ? FUNDING_SOURCE_LABELS[project.fundingSource] : NA),
    },
    {
      label: 'Data source',
      cell: ({ project }) => <VerificationBadge state={project.verification} />,
      csv: ({ project }) => VERIFICATION_LABELS[project.verification],
    },
  ];

  function exportCsv() {
    const header = ['Field', ...items.map((i) => `${i.project.projectCode} ${i.project.title}`)];
    const body = rows.map((r) => [r.label, ...items.map((i) => r.csv(i, rowOf(i.project.id)))]);
    const notes = [[''], ['Notes'], ...result.caveats.map((c) => [c]), [COMPARISON_DISCLAIMER]];
    downloadCsv(`civitrace-comparison-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body, ...notes]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {backLink}
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download className="size-4" aria-hidden />
          Export CSV
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Compare projects</h1>
        <p className="text-sm text-slate-500">
          {result.basis === 'none'
            ? 'Unit costs are not shown because these projects are not like-for-like.'
            : `Unit cost is shown ${unit}.`}
        </p>
      </div>

      {result.caveats.length > 0 && (
        <div role="alert" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Read before comparing</p>
          {result.caveats.map((c) => (
            <p key={c} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {c}
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left align-top">
            <tr>
              <th className="sticky left-0 w-44 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Field
              </th>
              {items.map(({ project: p }) => (
                <th key={p.id} className="min-w-48 px-4 py-3 font-normal">
                  <Link to={`/projects/${p.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                    {p.projectCode}
                  </Link>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{p.title}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="sticky left-0 bg-white px-4 py-3 text-left text-xs font-medium text-slate-500">
                  {r.label}
                </th>
                {items.map((i) => (
                  <td key={i.project.id} className="px-4 py-3 text-slate-800">
                    {r.cell(i, rowOf(i.project.id))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
        <p>{COMPARISON_DISCLAIMER}</p>
      </div>
    </div>
  );
}