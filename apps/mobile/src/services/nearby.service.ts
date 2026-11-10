import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DUPLICATE_RADIUS_M,
  DUPLICATE_WINDOW_DAYS,
  distanceInMeters,
  type ComplaintCategory,
  type ComplaintStatus,
  type GeoPoint,
} from '@civitrace/shared';
import type { TFunction } from 'i18next';
import { ServiceError, USE_MOCK_API } from './config';
import { delay } from './mock/db';
import { complaintsService } from './complaints.service';

export type PublicComplaint = {
  id: string;
  complaintNo: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  point: GeoPoint;
  areaLabel: string;
  supporters: number;
  supportedByMe: boolean;
  isHazard: boolean;
  isMine: boolean; // the citizen's own complaint
  createdAt: string;
  distanceM?: number;
};

type StoredItem = Omit<PublicComplaint, 'isMine' | 'distanceM'>;
type Stored = { origin: GeoPoint; items: StoredItem[] };

const KEY = 'civitrace.mock.public';
const DAY_MS = 24 * 60 * 60 * 1000;
const NEARBY_RADIUS_M = 2000;
const CLOSED: ComplaintStatus[] = ['closed', 'rejected'];

// Sample public complaints placed around the citizen: [category, status, metres north, metres east, supporters, hazard]
const SAMPLES: [ComplaintCategory, ComplaintStatus, number, number, number, boolean][] = [
  ['pothole', 'published', 80, 40, 12, true],
  ['drainage', 'in_progress', 30, -60, 5, false],
  ['streetlight', 'routed', -150, 120, 3, false],
  ['broken_road', 'resolved', 400, -300, 21, false],
  ['water_supply', 'acknowledged', -650, -500, 8, false],
  ['bridge', 'published', 900, 700, 15, true],
  ['pothole', 'closed', -1200, 300, 2, false],
  ['drainage', 'published', 1500, -900, 9, false],
];

function move(p: GeoPoint, northM: number, eastM: number): GeoPoint {
  return {
    lat: p.lat + northM / 111320,
    lng: p.lng + eastM / (111320 * Math.cos((p.lat * Math.PI) / 180)),
  };
}

async function readStored(): Promise<Stored | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Stored) : null;
}

async function writeStored(s: Stored) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

// Creates the samples once, and again only if the citizen moves far away
async function storedAround(origin: GeoPoint): Promise<Stored> {
  const stored = await readStored();
  if (stored && distanceInMeters(stored.origin, origin) < 5000) return stored;

  const mine = await complaintsService.mine();
  const area = mine[0] ? `${mine[0].location.settlement.name}، ${mine[0].location.district}` : '';
  const items: StoredItem[] = SAMPLES.map(([category, status, north, east, supporters, isHazard], i) => ({
    id: `pub_${i + 1}`,
    complaintNo: `CT-NEAR-${new Date().getFullYear()}-${String(i + 101).padStart(6, '0')}`,
    category,
    status,
    point: move(origin, north, east),
    areaLabel: area,
    supporters,
    supportedByMe: false,
    isHazard,
    createdAt: new Date(Date.now() - (i * 9 + 3) * DAY_MS).toISOString(),
  }));
  const fresh = { origin, items };
  await writeStored(fresh);
  return fresh;
}

// Public samples plus the citizen's own complaints, nearest first
async function allAround(origin: GeoPoint): Promise<PublicComplaint[]> {
  const stored = await storedAround(origin);
  const mine = await complaintsService.mine();
  const own: PublicComplaint[] = mine
    .filter((c) => !!c.point)
    .map((c) => ({
      id: c.id,
      complaintNo: c.complaintNo,
      category: c.category,
      status: c.status,
      point: c.point!,
      areaLabel: `${c.location.settlement.name}، ${c.location.district}`,
      supporters: 0,
      supportedByMe: false,
      isHazard: c.isHazard,
      isMine: true,
      createdAt: c.createdAt,
    }));
  return [...stored.items.map((i) => ({ ...i, isMine: false })), ...own]
    .map((c) => ({ ...c, distanceM: Math.round(distanceInMeters(origin, c.point)) }))
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
}

const mock = {
  async nearby(origin: GeoPoint): Promise<PublicComplaint[]> {
    await delay(400);
    return (await allAround(origin)).filter((c) => (c.distanceM ?? 0) <= NEARBY_RADIUS_M);
  },

  // Same type of problem, close by and recent: probably the same problem
  async similar(origin: GeoPoint, category: ComplaintCategory): Promise<PublicComplaint[]> {
    await delay(300);
    const since = Date.now() - DUPLICATE_WINDOW_DAYS * DAY_MS;
    return (await allAround(origin)).filter(
      (c) =>
        c.category === category &&
        (c.distanceM ?? Infinity) <= DUPLICATE_RADIUS_M &&
        new Date(c.createdAt).getTime() >= since &&
        !CLOSED.includes(c.status)
    );
  },

  async get(id: string): Promise<PublicComplaint> {
    await delay(200);
    const stored = await readStored();
    const item = stored?.items.find((i) => i.id === id);
    if (!stored || !item) throw new ServiceError('NOT_FOUND');
    return { ...item, isMine: false, distanceM: Math.round(distanceInMeters(stored.origin, item.point)) };
  },

  // "I am affected too". One support per citizen; the name is never shown.
  async support(id: string): Promise<PublicComplaint> {
    if (!USE_MOCK_API) throw new ServiceError('NETWORK');
    const stored = await readStored();
    const item = stored?.items.find((i) => i.id === id);
    if (!stored || !item) throw new ServiceError('NOT_FOUND');
    if (!item.supportedByMe) {
      item.supportedByMe = true;
      item.supporters += 1;
      await writeStored(stored);
    }
    await delay(300);
    return { ...item, isMine: false, distanceM: Math.round(distanceInMeters(stored.origin, item.point)) };
  },
};

function notReady(): never {
  throw new ServiceError('NETWORK', 'The real API is not connected yet.');
}

export const nearbyService = USE_MOCK_API
  ? mock
  : { nearby: notReady, similar: notReady, get: notReady, support: notReady };

export function formatDistance(meters: number | undefined, t: TFunction) {
  if (meters === undefined) return '';
  return meters < 1000
    ? t('nearby.distance', { meters })
    : t('nearby.distanceKm', { km: (meters / 1000).toFixed(1) });
}