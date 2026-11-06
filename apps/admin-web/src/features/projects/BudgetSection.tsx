import { AlertTriangle } from 'lucide-react';
import type { BudgetTotals, ProjectBudget } from '@civitrace/shared';
import { Money } from '@/components/ui/money';
import { VerificationBadge } from '@/features/complaints/ComplaintBadges';

type Props = {
  budgets: ProjectBudget[];
  totals: BudgetTotals;
};

function Stat({ label, minor, hint }: { label: string; minor?: number; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        <Money minor={minor} />
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function BudgetSection({ budgets, totals }: Props) {
  if (budgets.length === 0) {
    return <p className="text-sm text-slate-500">No budget has been recorded for this project yet.</p>;
  }

  const util = totals.utilizationPct;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Original approved" minor={totals.approved} />
        <Stat
          label="Applicable budget"
          minor={totals.applicable}
          hint={totals.hasRevision ? 'Includes revisions' : 'No revision recorded'}
        />
        <Stat label="Released" minor={totals.released} />
        <Stat label="Verified expenditure" minor={totals.spent} />
      </div>

      {/* Utilization */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Utilization</p>
          <p className="text-sm tabular-nums text-slate-900">
            {util !== undefined ? `${util}%` : <span className="text-slate-400">Not available</span>}
          </p>
        </div>
        {util !== undefined ? (
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(util, 100)}%` }} />
          </div>
        ) : (
          <p className="text-xs text-slate-400">Needs both the applicable budget and verified expenditure.</p>
        )}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400">Unspent allocation</dt>
          <dd className="text-sm text-slate-800">
            <Money minor={totals.unspentAllocation} />
          </dd>
          <p className="mt-0.5 text-xs text-slate-400">
            Applicable budget minus verified expenditure. This is not unspent cash.
          </p>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Not yet released</dt>
          <dd className="text-sm text-slate-800">
            <Money minor={totals.notReleased} />
          </dd>
          <p className="mt-0.5 text-xs text-slate-400">Applicable budget minus released funds.</p>
        </div>
      </dl>

      {totals.warnings.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          {totals.warnings.map((w) => (
            <p key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Per fiscal year */}
      <div className="-mx-5 overflow-x-auto border-t border-slate-100">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Fiscal year</th>
              <th className="px-5 py-3 text-right">Approved</th>
              <th className="px-5 py-3 text-right">Revised</th>
              <th className="px-5 py-3 text-right">Released</th>
              <th className="px-5 py-3 text-right">Verified spent</th>
              <th className="px-5 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {budgets.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-3 font-medium text-slate-800">{b.fiscalYear}</td>
                <td className="px-5 py-3 text-right"><Money minor={b.approvedMinor} /></td>
                <td className="px-5 py-3 text-right">
                  {b.revisedMinor !== undefined ? <Money minor={b.revisedMinor} /> : <span className="text-slate-400">No revision</span>}
                </td>
                <td className="px-5 py-3 text-right"><Money minor={b.releasedMinor} /></td>
                <td className="px-5 py-3 text-right"><Money minor={b.spentMinor} /></td>
                <td className="px-5 py-3"><VerificationBadge state={b.verification} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}