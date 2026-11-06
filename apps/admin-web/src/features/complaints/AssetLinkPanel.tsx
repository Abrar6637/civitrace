import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LoaderCircle, Plus } from 'lucide-react';
import {
  ASSET_TYPE_LABELS,
  NEARBY_ASSET_RADIUS_M,
  type Asset,
  type Complaint,
} from '@civitrace/shared';
import { assetsService } from '@/services/assets.service';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { formatLength } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateAssetForm } from '@/features/assets/CreateAssetForm';
import { LinkedAssetCard } from './LinkedAssetCard';

type Mode = 'view' | 'choose' | 'create' | 'confirm-unlink';

type Props = {
  complaint: Complaint;
  asset: Asset | null;
};

export function AssetLinkPanel({ complaint, asset }: Props) {
  const [mode, setMode] = useState<Mode>('view');
  const queryClient = useQueryClient();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
    queryClient.invalidateQueries({ queryKey: ['nearby-assets', complaint.id] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['asset'] });
  }

  const link = useMutation({
    mutationFn: (assetId: string | null) => complaintsService.linkAsset(complaint.id, { assetId }),
    onSuccess: () => {
      refresh();
      setMode('view');
    },
  });

  const errorMessage =
    link.error instanceof ApiError
      ? link.error.message
      : link.error
        ? 'Something went wrong. Please try again.'
        : null;

  if (mode === 'create') {
    return (
      <CreateAssetForm
        complaint={complaint}
        onDone={() => {
          refresh();
          setMode('view');
        }}
        onCancel={() => setMode('choose')}
      />
    );
  }

  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        <NearbyAssetPicker
          complaint={complaint}
          currentAssetId={asset?.id}
          pendingId={link.isPending ? link.variables : undefined}
          onPick={(id) => link.mutate(id)}
        />
        {errorMessage && <ErrorBox message={errorMessage} />}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => setMode('create')}>
            <Plus className="size-4" aria-hidden />
            New asset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LinkedAssetCard asset={asset} />

      {mode === 'confirm-unlink' && asset ? (
        <div className="space-y-2 rounded-lg bg-red-50 p-3">
          <p className="text-xs text-red-800">
            Unlink this complaint from {asset.assetCode}? It will no longer appear in this asset's history.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" loading={link.isPending} onClick={() => link.mutate(null)}>
              Unlink
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode('view')}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => {
              link.reset();
              setMode('choose');
            }}
          >
            {asset ? 'Change asset' : 'Link to asset'}
          </Button>
          {asset && (
            <Button size="sm" variant="ghost" onClick={() => setMode('confirm-unlink')}>
              Unlink
            </Button>
          )}
        </div>
      )}

      {errorMessage && <ErrorBox message={errorMessage} />}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

type PickerProps = {
  complaint: Complaint;
  currentAssetId?: string;
  pendingId?: string | null;
  onPick: (assetId: string) => void;
};

function NearbyAssetPicker({ complaint, currentAssetId, pendingId, onPick }: PickerProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nearby-assets', complaint.id],
    queryFn: () => assetsService.nearby(complaint.id),
  });

  const busy = pendingId !== undefined;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-900">Choose an asset</p>
        <p className="text-xs text-slate-500">
          In {complaint.location.tehsil} or within {formatLength(NEARBY_ASSET_RADIUS_M)}. Same type first.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-red-600">Could not load nearby assets.</p>}

      {data && data.data.length === 0 && (
        <p className="text-sm text-slate-500">No assets found nearby. Create a new one.</p>
      )}

      {data && data.data.length > 0 && (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {data.data.map((a) => {
            const isCurrent = a.id === currentAssetId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={isCurrent || busy}
                  onClick={() => onPick(a.id)}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-brand-700">{a.assetCode}</span>
                    {pendingId === a.id ? (
                      <LoaderCircle className="size-4 animate-spin text-brand-600" aria-label="Linking" />
                    ) : isCurrent ? (
                      <Badge tone="teal">Current</Badge>
                    ) : a.sameType ? (
                      <Badge tone="green">Same type</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {ASSET_TYPE_LABELS[a.type]} ·{' '}
                    {a.distanceM !== null ? `${formatLength(a.distanceM)} away` : 'Distance not available'} ·{' '}
                    {a.openComplaints} open
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}