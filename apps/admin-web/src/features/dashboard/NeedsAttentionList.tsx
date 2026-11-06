import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CATEGORY_LABELS, type Complaint } from '@civitrace/shared';
import { formatAge } from '@/lib/format';
import { StatusBadge } from '@/features/complaints/ComplaintBadges';

export function NeedsAttentionList({ items }: { items: Complaint[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" aria-hidden />
        <p className="text-sm text-slate-500">Nothing urgent right now.</p>
      </div>
    );
  }

  return (
    <ul className="-my-2 divide-y divide-slate-100">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            to={`/complaints/${c.id}`}
            className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-brand-700">{c.complaintNo}</span>
                {c.isHazard && <AlertTriangle className="size-3.5 text-red-500" aria-label="Hazard" />}
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-700">
                {CATEGORY_LABELS[c.category]} · {c.location.settlement.name}, {c.location.district}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={c.status} />
              <span className="text-xs text-slate-400">{formatAge(c.createdAt)} old</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}