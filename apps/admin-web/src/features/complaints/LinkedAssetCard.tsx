import { Link } from 'react-router';
import { Link2Off, MapPinned } from 'lucide-react';
import { ASSET_TYPE_LABELS, type Asset } from '@civitrace/shared';
import { ConditionBadge } from '@/features/assets/AssetBadges';

export function LinkedAssetCard({ asset }: { asset: Asset | null }) {
  if (!asset) {
    return (
      <div className="flex gap-2 text-sm text-slate-500">
        <Link2Off className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
        <span>Not linked to any asset yet.</span>
      </div>
    );
  }

  return (
    <Link
      to={`/assets/${asset.id}`}
      className="-m-2 flex gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <MapPinned className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-mono text-xs font-medium text-brand-700">{asset.assetCode}</p>
        <p className="truncate text-sm font-medium text-slate-900">{asset.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{ASSET_TYPE_LABELS[asset.type]}</span>
          <ConditionBadge condition={asset.condition} />
        </div>
      </div>
    </Link>
  );
}