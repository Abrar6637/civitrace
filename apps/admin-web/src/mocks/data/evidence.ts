import type { EvidenceItem } from '@civitrace/shared';

// Sample files for testing only (CC0 media from MDN). Real files come from the mobile app.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SAMPLE_AUDIO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';
const DAY_MS = 24 * 60 * 60 * 1000;

const store = new Map<string, EvidenceItem[]>();

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// A simple picture so the grid works without any network
function samplePhoto(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue},35%,78%)"/><stop offset="1" stop-color="hsl(${hue},25%,45%)"/>
    </linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <path d="M0 420 L800 380 L800 600 L0 600 Z" fill="hsl(${hue},10%,30%)"/>
    <ellipse cx="420" cy="480" rx="120" ry="34" fill="hsl(${hue},15%,18%)"/>
    <text x="400" y="120" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#fff">${label}</text>
    <text x="400" y="170" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#fff" opacity="0.85">Sample live photo</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function build(complaintId: string): EvidenceItem[] {
  const h = hash(complaintId);
  const capturedAt = new Date(Date.now() - (h % 20) * DAY_MS).toISOString();
  const base = { complaintId, capturedAt, reviewState: 'pending' as const };
  const items: EvidenceItem[] = [];

  const photos = 1 + (h % 3);
  for (let i = 0; i < photos; i++) {
    items.push({
      ...base,
      id: `ev_${complaintId}_p${i + 1}`,
      kind: 'photo',
      url: samplePhoto(`Photo ${i + 1}`, (h + i * 47) % 360),
      mimeType: 'image/jpeg',
      sizeBytes: 380_000 + ((h >> i) % 250_000),
      source: 'live_camera',
      gpsAccuracyM: 6 + (h % 30),
    });
  }
  if (h % 3 === 0) {
    items.push({
      ...base,
      id: `ev_${complaintId}_v1`,
      kind: 'video',
      url: SAMPLE_VIDEO,
      mimeType: 'video/mp4',
      sizeBytes: 4_200_000,
      durationSec: 5,
      source: 'live_camera',
      gpsAccuracyM: 12,
    });
  }
  if (h % 2 === 0) {
    items.push({
      ...base,
      id: `ev_${complaintId}_a1`,
      kind: 'voice',
      url: SAMPLE_AUDIO,
      mimeType: 'audio/mpeg',
      sizeBytes: 90_000,
      durationSec: 3,
      source: 'microphone',
    });
  }
  return items;
}

export function evidenceFor(complaintId: string): EvidenceItem[] {
  if (!store.has(complaintId)) store.set(complaintId, build(complaintId));
  return store.get(complaintId)!;
}