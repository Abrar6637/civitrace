import { useState } from 'react';
import { EyeOff, ImageOff, Plus } from 'lucide-react';
import { PHOTO_STAGES, PHOTO_STAGE_LABELS, type ProjectPhotoWithFiles } from '@civitrace/shared';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoUploadForm } from './PhotoUploadForm';

type Props = {
  projectId: string;
  photos: ProjectPhotoWithFiles[];
};

export function PhotoGallery({ projectId, photos }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      {photos.length === 0 && !adding && (
        <p className="text-sm text-slate-500">No photos yet. Add before and after photos as evidence.</p>
      )}

      {PHOTO_STAGES.map((stage) => {
        const items = photos.filter((p) => p.stage === stage);
        if (items.length === 0) return null;

        return (
          <section key={stage} className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {PHOTO_STAGE_LABELS[stage]} ({items.length})
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((p) => (
                <li key={p.id} className="space-y-1.5">
                  {p.file ? (
                    <a
                      href={p.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-slate-200"
                    >
                      <img
                        src={p.file.url}
                        alt={p.caption ?? PHOTO_STAGE_LABELS[stage]}
                        className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105"
                      />
                    </a>
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-lg bg-slate-100 text-slate-400">
                      <ImageOff className="size-6" aria-label="File not available" />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.file?.redacted && (
                      <Badge tone="teal">
                        <EyeOff className="size-3" aria-hidden />
                        Blurred
                      </Badge>
                    )}
                    {p.takenAt && <span className="text-xs text-slate-500">{formatDate(p.takenAt)}</span>}
                  </div>
                  {p.caption && <p className="text-xs text-slate-700">{p.caption}</p>}
                  {p.original && (
                    <a
                      href={p.original.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 underline hover:text-slate-600"
                    >
                      Original (admins only)
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {adding ? (
        <PhotoUploadForm projectId={projectId} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          Add photo
        </Button>
      )}
    </div>
  );
}