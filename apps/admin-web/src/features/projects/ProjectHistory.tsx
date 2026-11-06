import { History } from 'lucide-react';
import type { ProjectVersion } from '@civitrace/shared';
import { formatDateTime } from '@/lib/format';

export function ProjectHistory({ history }: { history: ProjectVersion[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-500">No history recorded.</p>;
  }

  return (
    <ol className="space-y-5">
      {history.map((v) => (
        <li key={v.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <History className="size-4 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-900">Version {v.version}</span>
            <span className="text-slate-500">
              · {v.action === 'created' ? 'Created' : 'Updated'} by {v.changedBy}
            </span>
            <span className="text-xs text-slate-400">{formatDateTime(v.changedAt)}</span>
          </div>

          {v.reason && <p className="text-sm text-slate-700">"{v.reason}"</p>}

          {v.changes.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="bg-slate-50 text-left font-medium text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Before</th>
                    <th className="px-3 py-2">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {v.changes.map((c) => (
                    <tr key={c.field}>
                      <td className="px-3 py-2 font-medium text-slate-700">{c.field}</td>
                      <td className="px-3 py-2 text-slate-400 line-through">{c.before ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-800">{c.after ?? 'Removed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}