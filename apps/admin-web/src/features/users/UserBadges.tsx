import type { User } from '@civitrace/shared';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/labels';

export function RoleBadge({ role }: { role: User['role'] }) {
  const tone = role === 'super_admin' ? 'violet' : role === 'area_admin' ? 'teal' : 'gray';
  return <Badge tone={tone}>{ROLE_LABELS[role]}</Badge>;
}

export function UserStatusBadge({ status }: { status: User['status'] }) {
  return status === 'active' ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>;
}