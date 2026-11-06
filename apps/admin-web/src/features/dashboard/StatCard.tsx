import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: number | undefined;
  hint: string;
  icon: LucideIcon;
  tone: string; // Tailwind classes for the icon box
};

export function StatCard({ label, value, hint, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-lg ${tone}`}>
          <Icon className="size-4.5" aria-hidden />
        </span>
      </div>
      {value === undefined ? (
        <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      )}
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}