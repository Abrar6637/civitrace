import { cn } from '@/lib/utils';

type Props = {
  actual?: number;
  planned?: number;
};

// Filled bar = actual progress, thin dark line = planned progress
export function ProgressBar({ actual, planned }: Props) {
  if (actual === undefined) return <span className="text-xs text-slate-400">Not available</span>;

  const behind = planned !== undefined && planned - actual >= 10;

  return (
    <div className="w-full min-w-28">
      <div
        className="relative h-2 rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={actual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Work progress"
      >
        <div
          className={cn('h-full rounded-full', behind ? 'bg-amber-500' : 'bg-brand-600')}
          style={{ width: `${actual}%` }}
        />
        {planned !== undefined && (
          <div
            className="absolute -top-1 h-4 w-0.5 rounded bg-slate-600"
            style={{ left: `calc(${planned}% - 1px)` }}
            title={`Planned: ${planned}%`}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {actual}% done
        {planned !== undefined && ` · planned ${planned}%`}
      </p>
    </div>
  );
}