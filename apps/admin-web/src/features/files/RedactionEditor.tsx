import { useRef, useState, type PointerEvent } from 'react';
import { X } from 'lucide-react';
import type { Box } from '@/lib/redact';

type Props = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  boxes: Box[];
  onChange: (boxes: Box[]) => void;
  disabled?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Box position as percentages, so it stays correct at any display size
const toStyle = (b: Box, w: number, h: number) => ({
  left: `${(b.x / w) * 100}%`,
  top: `${(b.y / h) * 100}%`,
  width: `${(b.w / w) * 100}%`,
  height: `${(b.h / h) * 100}%`,
});

export function RedactionEditor({ src, naturalWidth: W, naturalHeight: H, boxes, onChange, disabled }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);

  // Screen position → image pixels
  function toImage(e: PointerEvent) {
    const rect = areaRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * W, 0, W),
      y: clamp(((e.clientY - rect.top) / rect.height) * H, 0, H),
    };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toImage(e);
    startRef.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (!start) return;
    const p = toImage(e);
    setDraft({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }

  function onPointerUp() {
    // Ignore accidental clicks: the box must be at least 1% of the image
    if (draft && draft.w > W * 0.01 && draft.h > H * 0.01) onChange([...boxes, draft]);
    startRef.current = null;
    setDraft(null);
  }

  return (
    <div className="space-y-2">
      <div
        ref={areaRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg bg-slate-900"
        style={{ aspectRatio: `${W} / ${H}`, maxHeight: '60vh', maxWidth: `calc(60vh * ${W / H})` }}
      >
        <img
          src={src}
          alt="Photo to check for faces and number plates"
          draggable={false}
          className="pointer-events-none h-full w-full"
        />

        {boxes.map((b, i) => (
          <div
            key={i}
            className="absolute border-2 border-red-500 bg-red-500/20 backdrop-blur-md"
            style={toStyle(b, W, H)}
          >
            {!disabled && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onChange(boxes.filter((_, j) => j !== i))}
                aria-label={`Remove area ${i + 1}`}
                className="absolute -right-2.5 -top-2.5 grid size-5 place-items-center rounded-full bg-white text-slate-700 shadow"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}

        {draft && (
          <div className="absolute border-2 border-dashed border-white bg-white/20" style={toStyle(draft, W, H)} />
        )}
      </div>

      <p className="text-xs text-slate-500">
        Drag over every face and number plate. {boxes.length === 1 ? '1 area' : `${boxes.length} areas`} marked.
      </p>
    </div>
  );
}