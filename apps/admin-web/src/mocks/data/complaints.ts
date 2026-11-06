import { COMPLAINT_CATEGORIES } from '@civitrace/shared';
import type {
  CitizenConfirmationState,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  SettlementType,
  VerificationState,
} from '@civitrace/shared';

// Har dafa same data bane, is liye "seeded" random
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

type Place = { tehsil: string; ucNo: string; ucName: string; type: SettlementType; name: string };

// Mock ke liye namoone ki jagahein (UC numbers asli record nahi hain)
const AREAS: { district: string; code: string; lat: number; lng: number; places: Place[] }[] = [
  {
    district: 'Lahore', code: 'LHR', lat: 31.52, lng: 74.35,
    places: [
      { tehsil: 'Model Town', ucNo: '112', ucName: 'Township', type: 'city', name: 'Lahore' },
      { tehsil: 'Shalimar', ucNo: '23', ucName: 'Baghbanpura', type: 'city', name: 'Lahore' },
      { tehsil: 'Raiwind', ucNo: '201', ucName: 'Raiwind', type: 'town', name: 'Raiwind' },
      { tehsil: 'Raiwind', ucNo: '208', ucName: 'Manga', type: 'village', name: 'Manga Mandi' },
    ],
  },
  {
    district: 'Kasur', code: 'KSR', lat: 31.12, lng: 74.45,
    places: [
      { tehsil: 'Kasur', ucNo: '12', ucName: 'Kot Haleem Khan', type: 'city', name: 'Kasur' },
      { tehsil: 'Chunian', ucNo: '58', ucName: 'Chunian', type: 'town', name: 'Chunian' },
      { tehsil: 'Pattoki', ucNo: '87', ucName: 'Jamber', type: 'village', name: 'Jamber Kalan' },
    ],
  },
  {
    district: 'Faisalabad', code: 'FSD', lat: 31.42, lng: 73.08,
    places: [
      { tehsil: 'Faisalabad City', ucNo: '30', ucName: 'Ghulam Muhammad Abad', type: 'city', name: 'Faisalabad' },
      { tehsil: 'Jaranwala', ucNo: '140', ucName: 'Jaranwala', type: 'town', name: 'Jaranwala' },
      { tehsil: 'Samundri', ucNo: '170', ucName: 'Chak 448 GB', type: 'village', name: 'Chak 448 GB' },
    ],
  },
   {
    district: 'Rawalpindi', code: 'RWP', lat: 33.6, lng: 73.05,
    places: [
      { tehsil: 'Rawalpindi', ucNo: '10', ucName: 'Satellite Town', type: 'city', name: 'Rawalpindi' },
      { tehsil: 'Gujar Khan', ucNo: '60', ucName: 'Daultala', type: 'village', name: 'Daultala' },
    ],
  },
  {
    district: 'Murree', code: 'MRE', lat: 33.91, lng: 73.39,
    places: [
      { tehsil: 'Murree', ucNo: '4', ucName: 'Ghora Gali', type: 'village', name: 'Ghora Gali' },
    ],
  },
  {
    district: 'Multan', code: 'MUL', lat: 30.2, lng: 71.47,
    places: [
      { tehsil: 'Multan City', ucNo: '15', ucName: 'Gulgasht', type: 'city', name: 'Multan' },
      { tehsil: 'Shujabad', ucNo: '75', ucName: 'Shujabad', type: 'town', name: 'Shujabad' },
    ],
  },
];

const DESCRIPTIONS: Record<ComplaintCategory, string[]> = {
  road_missing: [
    'No paved road connects our village to the main highway.',
    'Kacha road becomes impassable for months during monsoon.',
  ],
  pothole: [
    'Deep pothole near the school gate, bikes keep falling.',
    'Several potholes on the main bazaar road after the last rain.',
  ],
  broken_road: [
    'Road built last year has already cracked and broken apart.',
    'Carpeted surface washed away, only gravel left.',
  ],
  streetlight: [
    'Streetlights in our street have been off for three weeks.',
    'Pole light flickering and wires hanging low.',
  ],
  drainage: [
    'Sewage overflowing into the street near the mosque.',
    'Open drain is blocked, water standing for days.',
  ],
  water_supply: [
    'No water supply in the area for the last five days.',
    'Supply line leaking, clean water wasting on the road.',
  ],
  bridge: [
    'Culvert wall has collapsed on one side, unsafe for vehicles.',
    'Small bridge railing missing, children cross daily.',
  ],
  other: [
    'Footpath encroached completely, people walk on the road.',
    'Speed breaker removed, accidents increasing.',
  ],
};

const STATUS_POOL: ComplaintStatus[] = [
  'submitted', 'submitted', 'submitted', 'under_review', 'under_review',
  'published', 'published', 'routed', 'acknowledged', 'action_planned',
  'in_progress', 'awaiting_confirmation', 'awaiting_confirmation',
  'resolved', 'resolved', 'reopened', 'closed', 'rejected',
];

export function verificationFor(status: ComplaintStatus): VerificationState {
  switch (status) {
    case 'submitted':
    case 'rejected':
      return 'citizen_reported';
    case 'under_review':
      return 'under_review';
    case 'routed':
      return 'documented';
    case 'acknowledged':
    case 'action_planned':
    case 'in_progress':
    case 'awaiting_confirmation':
      return 'officially_acknowledged';
    case 'reopened':
      return 'disputed';
    default:
      return 'admin_verified';
  }
}

function confirmationFor(status: ComplaintStatus): CitizenConfirmationState {
  if (status === 'awaiting_confirmation') return 'pending';
  if (status === 'resolved' || status === 'closed') return 'confirmed';
  if (status === 'reopened') return 'disputed';
  return 'not_requested';
}
const DAY = 86_400_000;
const now = Date.now();

export const mockComplaints: Complaint[] = Array.from({ length: 64 }, (_, i) => {
  const area = pick(AREAS);
  const place = pick(area.places);
  const category = pick(COMPLAINT_CATEGORIES);
  const status = pick(STATUS_POOL);
  const createdMs = now - Math.floor(rand() * 90 * DAY);
  const updatedMs = Math.min(now, createdMs + Math.floor(rand() * 10 * DAY));
  const seq = String(i + 1).padStart(6, '0');

  return {
    id: `c_${seq}`,
    complaintNo: `CT-${area.code}-2026-${seq}`,
    reporterId: 'u_citizen_1',
    category,
    description: pick(DESCRIPTIONS[category]),
    location: {
      country: 'PK',
      province: 'Punjab',
      district: area.district,
      tehsil: place.tehsil,
      unionCouncil: { number: place.ucNo, name: place.ucName },
      settlement: { type: place.type, name: place.name },
    },
    point: {
      lat: area.lat + (rand() - 0.5) * 0.2,
      lng: area.lng + (rand() - 0.5) * 0.2,
      accuracyM: Math.round(5 + rand() * 40),
    },
    lowConfidenceGps: rand() < 0.1,
    status,
    verification: verificationFor(status),
    citizenConfirmation: confirmationFor(status),
    confirmationDueAt:
      status === 'awaiting_confirmation'
        ? new Date(updatedMs + 14 * DAY).toISOString()
        : undefined,
    notifyMna: rand() < 0.2,
    notifyMpa: rand() < 0.3,
    supportCount: Math.floor(rand() * rand() * 120),
    isHazard: ['bridge', 'drainage', 'broken_road'].includes(category) && rand() < 0.35,
    createdAt: new Date(createdMs).toISOString(),
    updatedAt: new Date(updatedMs).toISOString(),
  };
}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// A few near-duplicates (the same issue reported again nearby) to test merging
const OPEN_FOR_DUPLICATES: ComplaintStatus[] = ['submitted', 'under_review', 'published', 'routed', 'in_progress'];

mockComplaints
  .filter((c) => OPEN_FOR_DUPLICATES.includes(c.status) && c.point)
  .slice(0, 4)
  .forEach((original, k) => {
    const seq = String(65 + k).padStart(6, '0');
    const createdMs = Math.min(now, new Date(original.createdAt).getTime() + (2 + k) * DAY);
    const created = new Date(createdMs).toISOString();

    mockComplaints.push({
      ...original,
      id: `c_${seq}`,
      complaintNo: original.complaintNo.replace(/\d{6}$/, seq),
      reporterId: 'u_citizen_2',
      description: `Same problem again. ${original.description}`,
      point: { lat: original.point!.lat + 0.0004, lng: original.point!.lng - 0.0003, accuracyM: 15 },
      status: 'submitted',
      verification: 'citizen_reported',
      citizenConfirmation: 'not_requested',
      confirmationDueAt: undefined,
      assignedVerifierId: undefined,
      supportCount: 2 + k,
      createdAt: created,
      updatedAt: created,
    });
  });

mockComplaints.sort((a, b) => b.createdAt.localeCompare(a.createdAt));