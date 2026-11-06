import { Link } from 'react-router';
import { Info } from 'lucide-react';
import {
  DAMAGE_TYPE_LABELS,
  FEEDBACK_DISCLAIMER,
  REVIEW_PERIOD_LABELS,
  feedbackWindows,
  summarizeFeedback,
  type ConditionFeedback,
  type Project,
} from '@civitrace/shared';
import { formatDate } from '@/lib/format';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ConditionScore } from '@/features/feedback/ConditionScore';

const WINDOW_TONES: Record<'upcoming' | 'open' | 'closed', BadgeTone> = {
  upcoming: 'gray',
  open: 'teal',
  closed: 'blue',
};

type Props = {
  project: Project;
  feedback: ConditionFeedback[];
};

export function ConditionSection({ project, feedback }: Props) {
  if (project.status !== 'completed' || !project.actualEnd) {
    return (
      <p className="text-sm text-slate-500">
        Citizens can send condition feedback at 3, 6 and 12 months after the work is completed.
      </p>
    );
  }

  const windows = feedbackWindows(project.actualEnd);
  const summary = summarizeFeedback(feedback);

  return (
    <div className="space-y-5">
      {/* Windows */}
      <div className="grid gap-3 sm:grid-cols-3">
        {windows.map((w) => {
          const s = summary.byPeriod.find((b) => b.period === w.period);
          return (
            <div key={w.period} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{REVIEW_PERIOD_LABELS[w.period]}</p>
                <Badge tone={WINDOW_TONES[w.state]}>{w.state === 'open' ? 'Open now' : w.state === 'upcoming' ? 'Upcoming' : 'Closed'}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {formatDate(w.opensAt)} – {formatDate(w.closesAt)}
              </p>
              {s?.averageScore !== undefined ? (
                <div>
                  <ConditionScore score={s.averageScore} />
                  <p className="text-xs text-slate-400">
                    Average of {s.count} accepted {s.count === 1 ? 'report' : 'reports'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">{w.state === 'upcoming' ? 'Not open yet' : 'No accepted feedback'}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Damage reports and common problems */}
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-400">Damage reports (accepted)</dt>
          <dd className="text-sm text-slate-800">{summary.byPeriod.find((b) => b.period === 'ad_hoc')?.count ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Most reported problems</dt>
          <dd className="text-sm text-slate-800">
            {summary.commonDamage.length > 0
              ? summary.commonDamage.map((d) => `${DAMAGE_TYPE_LABELS[d.type]} (${d.count})`).join(', ')
              : 'None reported'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Waiting for review</dt>
          <dd className="text-sm text-slate-800">
            {summary.pending > 0 ? (
              <Link to="/feedback" className="font-medium text-brand-700 hover:underline">
                {summary.pending} to review
              </Link>
            ) : (
              'None'
            )}
          </dd>
        </div>
      </dl>

      <p className="flex gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {FEEDBACK_DISCLAIMER}
      </p>
    </div>
  );
}