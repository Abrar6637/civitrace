import { RotateCcw } from 'lucide-react';
import { ASSET_CONDITION_LABELS, type AssetCondition } from '@civitrace/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const CONDITION_TONES: Record<AssetCondition, BadgeTone> = {
  good: 'green',
  fair: 'blue',
  poor: 'amber',
  critical: 'red',
  unknown: 'gray',
};

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  return <Badge tone={CONDITION_TONES[condition]}>{ASSET_CONDITION_LABELS[condition]}</Badge>;
}

export function RepeatIssueBadge() {
  return (
    <Badge tone="amber">
      <RotateCcw className="size-3" aria-hidden />
      Repeat issue
    </Badge>
  );
}