import { getDivisionOf, type DashboardSummary } from '@civitrace/shared';

type Props = { rows: DashboardSummary['byDistrict'] };

export function DistrictTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No complaints yet.</p>;
  }

  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">District</th>
            <th className="px-5 py-3">Division</th>
            <th className="px-5 py-3 text-right">Open</th>
            <th className="px-5 py-3 text-right">Awaiting</th>
            <th className="px-5 py-3 text-right">Resolved</th>
            <th className="px-5 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((r) => (
            <tr key={r.district}>
              <td className="px-5 py-3 font-medium text-slate-800">{r.district}</td>
              <td className="px-5 py-3 text-slate-500">{getDivisionOf(r.district) ?? 'Not available'}</td>
              <td className="px-5 py-3 text-right text-slate-700">{r.open}</td>
              <td className="px-5 py-3 text-right text-slate-700">{r.awaiting}</td>
              <td className="px-5 py-3 text-right text-slate-700">{r.resolved}</td>
              <td className="px-5 py-3 text-right font-medium text-slate-900">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}