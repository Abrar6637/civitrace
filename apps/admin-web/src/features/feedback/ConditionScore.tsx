import { CONDITION_SCORE_LABELS } from '@civitrace/shared';
import { cn } from '@/lib/utils';

// Five small bars, filled up to the score. The label is always shown, so meaning is not color-only.
export function ConditionScore({ score, className }: { score: number; className?: string }) {
  const rounded = Math.round(score);
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('h-3 w-1.5 rounded-sm', i <= rounded ? 'bg-brand-600' : 'bg-slate-200')} />
        ))}
      </span>
      <span className="text-sm text-slate-800">
        <span className="font-medium tabular-nums">{Number.isInteger(score) ? score : score.toFixed(1)}/5</span>{' '}
        <span className="text-slate-500">{CONDITION_SCORE_LABELS[rounded]}</span>
      </span>
    </span>
  );
}