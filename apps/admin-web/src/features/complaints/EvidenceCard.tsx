import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, ImageIcon, Lock, Mic, Play, ShieldCheck, Video, X } from 'lucide-react';
import {
  EVIDENCE_REVIEW_LABELS,
  formatBytes,
  type EvidenceItem,
  type EvidenceReviewState,
} from '@civitrace/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { evidenceService } from '@/services/evidence.service';

const STATE_CLASSES: Record<EvidenceReviewState, string> = {
  pending: 'bg-amber-100 text-amber-800',
  public: 'bg-emerald-100 text-emerald-800',
  hidden: 'bg-slate-200 text-slate-700',
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

function StateBadge({ state }: { state: EvidenceReviewState }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASSES[state]}`}>
      {EVIDENCE_REVIEW_LABELS[state]}
    </span>
  );
}

function Thumb({ item, onOpen }: { item: EvidenceItem; onOpen: () => void }) {
  const label = item.kind === 'photo' ? 'Photo' : item.kind === 'video' ? 'Video' : 'Voice note';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      aria-label={`Open ${label.toLowerCase()}`}
    >
      {item.kind === 'photo' ? (
        <img src={item.url} alt="" className="size-full object-cover transition group-hover:scale-105" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-slate-800 text-white">
          {item.kind === 'video' ? <Play className="size-8" aria-hidden /> : <Mic className="size-8" aria-hidden />}
          <span className="text-xs">{item.durationSec ? `${item.durationSec}s` : label}</span>
        </div>
      )}
      <span className="absolute left-1.5 top-1.5">
        <StateBadge state={item.reviewState} />
      </span>
    </button>
  );
}

function ReviewPanel({ item, complaintId, onDone }: { item: EvidenceItem; complaintId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState({ noFaces: false, noPlates: false, noPersonalInfo: false });
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState('');

  const review = useMutation({
    mutationFn: (decision: 'public' | 'hidden') =>
      evidenceService.review(complaintId, item.id, decision === 'public' ? { decision, checks } : { decision, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evidence', complaintId] });
      void queryClient.invalidateQueries({ queryKey: ['audit'] });
      onDone();
    },
  });

  const allChecked = checks.noFaces && checks.noPlates && checks.noPersonalInfo;

  if (item.kind === 'voice') {
    return (
      <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Voice notes are for admins only and are never made public, because a citizen’s voice is personal data.
      </p>
    );
  }

  const checkRow = (key: keyof typeof checks, text: string) => (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-brand-600"
        checked={checks[key]}
        onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
      />
      {text}
    </label>
  );

  return (
    <div className="space-y-4">
      {!hiding ? (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden /> Privacy check before publishing
          </p>
          {checkRow('noFaces', 'No person’s face can be recognised')}
          {checkRow('noPlates', 'No vehicle number plate can be read')}
          {checkRow('noPersonalInfo', 'No personal details (inside of a home, names, phone numbers, documents)')}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              disabled={!allChecked || review.isPending || item.reviewState === 'public'}
              onClick={() => review.mutate('public')}
            >
              <Eye className="size-4" aria-hidden /> Make public
            </Button>
            {item.reviewState !== 'hidden' && (
              <Button size="sm" variant="secondary" onClick={() => setHiding(true)}>
                <EyeOff className="size-4" aria-hidden /> Hide
              </Button>
            )}
          </div>
          {!allChecked && <p className="text-xs text-slate-500">Tick all three boxes to enable “Make public”.</p>}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-900" htmlFor="hide-reason">
            Why should this be hidden?
          </label>
          <textarea
            id="hide-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. A child’s face is clearly visible."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={reason.trim().length < 5 || review.isPending}
              onClick={() => review.mutate('hidden')}
            >
              <EyeOff className="size-4" aria-hidden /> Hide this item
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setHiding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {review.error && <p className="text-sm text-red-600">{(review.error as Error).message}</p>}
    </div>
  );
}

function Viewer({ item, complaintId, onClose }: { item: EvidenceItem; complaintId: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence viewer"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-64 flex-1 items-center justify-center bg-black">
          {item.kind === 'photo' && <img src={item.url} alt="Evidence photo" className="max-h-[70vh] w-full object-contain" />}
          {item.kind === 'video' && (
            <video src={item.url} controls muted autoPlay className="max-h-[70vh] w-full" aria-label="Evidence video">
              Your browser cannot play this video.
            </video>
          )}
          {item.kind === 'voice' && (
            <div className="flex w-full flex-col items-center gap-4 p-8 text-white">
              <Mic className="size-12" aria-hidden />
              <audio src={item.url} controls className="w-full max-w-sm" aria-label="Citizen voice note" />
            </div>
          )}
        </div>

        <div className="w-full space-y-4 overflow-y-auto p-5 md:w-80">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold capitalize text-slate-900">{item.kind === 'voice' ? 'Voice note' : item.kind}</p>
              <StateBadge state={item.reviewState} />
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-slate-500">Captured</dt>
            <dd className="text-slate-800">{formatWhen(item.capturedAt)}</dd>
            <dt className="text-slate-500">Source</dt>
            <dd className="text-slate-800">{item.source === 'live_camera' ? 'Live camera' : 'Microphone'}</dd>
            <dt className="text-slate-500">Size</dt>
            <dd className="text-slate-800">{formatBytes(item.sizeBytes)}</dd>
            {item.durationSec && (
              <>
                <dt className="text-slate-500">Length</dt>
                <dd className="text-slate-800">{item.durationSec} s</dd>
              </>
            )}
            {item.gpsAccuracyM !== undefined && (
              <>
                <dt className="text-slate-500">GPS accuracy</dt>
                <dd className="text-slate-800">±{item.gpsAccuracyM} m</dd>
              </>
            )}
          </dl>

          {item.reviewedAt && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {item.reviewState === 'public' ? 'Made public' : 'Hidden'} by {item.reviewedByName} on {formatWhen(item.reviewedAt)}
              {item.hideReason && <span className="mt-1 block">Reason: {item.hideReason}</span>}
            </p>
          )}

          <ReviewPanel key={`${item.id}-${item.reviewState}`} item={item} complaintId={complaintId} onDone={onClose} />
        </div>
      </div>
    </div>
  );
}

// Live photos, video and voice note sent by the citizen, with the publish decision
export function EvidenceCard({ complaintId }: { complaintId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['evidence', complaintId],
    queryFn: () => evidenceService.list(complaintId),
  });

  const items = data?.items ?? [];
  const open = items.find((i) => i.id === openId) ?? null;
  const pending = items.filter((i) => i.reviewState === 'pending' && i.kind !== 'voice').length;

  return (
    <Card
      title="Evidence"
      action={
        pending > 0 ? (
          <span className="text-xs font-medium text-amber-700">{pending} not checked</span>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          Could not load the evidence.
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && <p className="text-sm text-slate-500">No evidence was sent.</p>}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <Thumb key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
            ))}
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="size-3.5" aria-hidden /> {items.filter((i) => i.kind === 'photo').length} photos
            </span>
            <span className="inline-flex items-center gap-1">
              <Video className="size-3.5" aria-hidden /> {items.filter((i) => i.kind === 'video').length} video
            </span>
            <span className="inline-flex items-center gap-1">
              <Mic className="size-3.5" aria-hidden /> {items.filter((i) => i.kind === 'voice').length} voice note
            </span>
            <span>All taken live in the app. Nothing is public until an admin checks it.</span>
          </p>
        </div>
      )}

      {open && <Viewer item={open} complaintId={complaintId} onClose={() => setOpenId(null)} />}
    </Card>
  );
}