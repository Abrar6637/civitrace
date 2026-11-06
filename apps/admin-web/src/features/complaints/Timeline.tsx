import type { ComplaintEvent } from '@civitrace/shared';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './ComplaintBadges';

export function Timeline({ events }: { events: ComplaintEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No records yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.toStatus} />
            <span className="text-xs text-slate-400">{formatDateTime(e.at)}</span>
          </div>
          {e.note && <p className="mt-1 text-sm text-slate-700">{e.note}</p>}
          {e.actorName && <p className="mt-0.5 text-xs text-slate-400">by {e.actorName}</p>}
        </li>
      ))}
    </ol>
  );
}