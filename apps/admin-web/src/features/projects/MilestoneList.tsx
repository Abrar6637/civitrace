import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Pencil, Plus } from 'lucide-react';
import { MILESTONE_STATUS_LABELS, type Milestone, type MilestoneStatus } from '@civitrace/shared';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { MilestoneForm } from './MilestoneForm';

const ICONS: Record<MilestoneStatus, { icon: typeof Circle; className: string }> = {
  done: { icon: CheckCircle2, className: 'text-emerald-600' },
  in_progress: { icon: CircleDot, className: 'text-brand-600' },
  delayed: { icon: AlertTriangle, className: 'text-amber-600' },
  pending: { icon: Circle, className: 'text-slate-300' },
};

type Props = {
  projectId: string;
  milestones: Milestone[];
};

export function MilestoneList({ projectId, milestones }: Props) {
  // null = nothing open, 'new' = add form, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);

  return (
    <div className="space-y-4">
      {milestones.length === 0 && editing !== 'new' && (
        <p className="text-sm text-slate-500">No milestones recorded.</p>
      )}

      <ol className="space-y-4">
        {milestones.map((m) => {
          if (editing === m.id) {
            return (
              <li key={m.id}>
                <MilestoneForm projectId={projectId} milestone={m} onDone={close} onCancel={close} />
              </li>
            );
          }

          const { icon: Icon, className } = ICONS[m.status];
          return (
            <li key={m.id} className="group flex gap-3">
              <Icon className={`mt-0.5 size-5 shrink-0 ${className}`} aria-label={MILESTONE_STATUS_LABELS[m.status]} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{m.title}</p>
                <p className="text-xs text-slate-500">
                  Planned {m.plannedAt ? formatDate(m.plannedAt) : 'Not available'}
                  {' · '}
                  {m.actualAt ? `Done ${formatDate(m.actualAt)}` : MILESTONE_STATUS_LABELS[m.status]}
                </p>
                {m.note && <p className="mt-1 text-xs text-slate-600">{m.note}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setEditing(m.id)}
                aria-label={`Edit ${m.title}`}
              >
                <Pencil className="size-3.5" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ol>

      {editing === 'new' ? (
        <MilestoneForm projectId={projectId} onDone={close} onCancel={close} />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          Add milestone
        </Button>
      )}
    </div>
  );
}