import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@civitrace/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const TONES: Record<ProjectStatus, BadgeTone> = {
  proposed: 'gray',
  approved: 'blue',
  tendered: 'violet',
  in_progress: 'teal',
  completed: 'green',
  stalled: 'amber',
  cancelled: 'red',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}