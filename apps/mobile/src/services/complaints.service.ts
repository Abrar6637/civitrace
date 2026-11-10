import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CONFIRMATION_RESPONSES,
  CONFIRMATION_WINDOW_DAYS,
  DAMAGE_TYPES,
  complaintSubmitInputSchema,
  distanceInMeters,
  districtCode,
  feedbackWindows,
  isSameArea,
  resolutionConfirmationInputSchema,
  type ComplaintCategory,
  type ComplaintStatus,
  type DamageType,
  type FeedbackReviewStatus,
  type GeoPoint,
  type LocationRef,
  type ReviewPeriod,
} from '@civitrace/shared';
import { ServiceError, USE_MOCK_API } from './config';
import { notifyStatusChange, scheduleFeedbackReminders } from '../lib/notify';
import { delay } from './mock/db';
import { isOnline } from '../lib/network';
import { buildSubmitPayload } from '../lib/complaint-payload';
import type { ReportDraft } from '../store/report-draft';

export type ConfirmationResponse = (typeof CONFIRMATION_RESPONSES)[number];

export type TimelineEvent = { status: ComplaintStatus; at: string; note?: string };

export type ComplaintEvidence = { kind: 'photo' | 'video'; uri: string; durationSec?: number };

export type MyConfirmation = {
  response: ConfirmationResponse;
  comment?: string;
  rating?: number;
  photos: string[];
  distanceM?: number;
  locationMismatch: boolean;
  at: string;
};

export type MyFeedback = {
  period: ReviewPeriod;
  conditionScore: number;
  damageTypes: DamageType[];
  narrative?: string;
  photos: string[];
  distanceM?: number;
  reviewStatus: FeedbackReviewStatus; // counted only after an admin accepts it
  at: string;
};

export type ConfirmInput = {
  response: ConfirmationResponse;
  comment?: string;
  rating?: number;
  photos: string[];
  location: LocationRef;
  point: GeoPoint;
};

export type FeedbackInput = {
  period: ReviewPeriod;
  conditionScore: number;
  damageTypes: DamageType[];
  narrative?: string;
  photos: string[];
  point: GeoPoint;
};

export type MyComplaint = {
  id: string;
  complaintNo: string;
  clientDraftId: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  description?: string;
  voiceNote?: { uri: string; durationSec: number };
  evidence: ComplaintEvidence[];
  location: LocationRef;
  point?: GeoPoint;
  lowConfidenceGps: boolean;
  isHazard: boolean;
  notifyMna: boolean;
  notifyMpa: boolean;
  timeline: TimelineEvent[];
  confirmations: MyConfirmation[];
  feedbacks: MyFeedback[];
  createdAt: string;
  updatedAt: string;
};

const MINE_KEY = 'civitrace.mock.complaints';
const DAY_MS = 24 * 60 * 60 * 1000;

// Complaints saved by older versions had fewer fields
function normalize(raw: Partial<MyComplaint> & Pick<MyComplaint, 'id' | 'createdAt' | 'status'>): MyComplaint {
  return {
    evidence: [],
    lowConfidenceGps: false,
    isHazard: false,
    notifyMna: false,
    notifyMpa: false,
    timeline: [{ status: 'submitted', at: raw.createdAt }],
    confirmations: [],
    feedbacks: [],
    updatedAt: raw.createdAt,
    ...raw,
  } as MyComplaint;
}

async function loadMine(): Promise<MyComplaint[]> {
  const raw = await AsyncStorage.getItem(MINE_KEY);
  return raw ? (JSON.parse(raw) as MyComplaint[]).map(normalize) : [];
}

async function saveMine(list: MyComplaint[]) {
  await AsyncStorage.setItem(MINE_KEY, JSON.stringify(list));
}

// When the citizen's answer was first requested (latest time)
export function confirmationRequestedAt(c: MyComplaint) {
  return [...c.timeline].reverse().find((e) => e.status === 'awaiting_confirmation')?.at;
}

export function confirmationDaysLeft(c: MyComplaint) {
  const at = confirmationRequestedAt(c);
  if (!at) return 0;
  const left = CONFIRMATION_WINDOW_DAYS - (Date.now() - new Date(at).getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(left));
}

// When the citizen confirmed the work (latest time)
export function resolvedAt(c: MyComplaint) {
  return [...c.timeline].reverse().find((e) => e.status === 'resolved')?.at;
}

// 3, 6 and 12 month windows, counted from the confirmed resolution
export function complaintFeedbackWindows(c: MyComplaint) {
  const at = resolvedAt(c);
  return at ? feedbackWindows(at.slice(0, 10)) : [];
}

// Next status for the test button (acts like an admin)
const NEXT_STATUS: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
  submitted: 'under_review',
  under_review: 'published',
  published: 'routed',
  routed: 'acknowledged',
  acknowledged: 'in_progress',
  action_planned: 'in_progress',
  in_progress: 'awaiting_confirmation',
  reopened: 'in_progress',
  resolved: 'closed',
};

const mock = {
  async submit(_token: string, draft: ReportDraft, onProgress?: (fraction: number) => void): Promise<MyComplaint> {
    if (!(await isOnline())) throw new ServiceError('NETWORK');

    const parsed = complaintSubmitInputSchema.safeParse(buildSubmitPayload(draft));
    if (!parsed.success) throw new ServiceError('INVALID', parsed.error.issues[0]?.message);

    const list = await loadMine();
    const existing = list.find((c) => c.clientDraftId === draft.draftId);
    if (existing) return existing; // already sent before the network dropped

    // Simulated upload, one file at a time
    const files = draft.evidence.length + (draft.voiceNote ? 1 : 0);
    for (let i = 0; i < files; i++) {
      await delay(500);
      onProgress?.((i + 1) / (files + 1));
    }
    await delay(400);

    const input = parsed.data;
    const now = new Date().toISOString();
    const seq = String(list.length + 1).padStart(6, '0');
    const complaint: MyComplaint = {
      id: `mc_${Date.now()}`,
      complaintNo: `CT-${districtCode(input.location.district)}-${new Date().getFullYear()}-${seq}`,
      clientDraftId: draft.draftId,
      category: input.category,
      status: 'submitted',
      description: input.description,
      voiceNote: draft.voiceNote,
      evidence: draft.evidence.map((e) => ({ kind: e.kind, uri: e.uri, durationSec: e.durationSec })),
      location: input.location,
      point: input.point,
      lowConfidenceGps: input.lowConfidenceGps,
      isHazard: input.isHazard,
      notifyMna: input.notifyMna,
      notifyMpa: input.notifyMpa,
      timeline: [{ status: 'submitted', at: now }],
      confirmations: [],
      feedbacks: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveMine([complaint, ...list]);
    onProgress?.(1);
    return complaint;
  },

  async mine(): Promise<MyComplaint[]> {
    await delay(300);
    return loadMine();
  },

  async get(id: string): Promise<MyComplaint> {
    await delay(200);
    const found = (await loadMine()).find((c) => c.id === id);
    if (!found) throw new ServiceError('NOT_FOUND');
    return found;
  },

  // The citizen says whether the work really fixed the problem
  async confirm(id: string, input: ConfirmInput): Promise<MyComplaint> {
    if (!(await isOnline())) throw new ServiceError('NETWORK');

    const parsed = resolutionConfirmationInputSchema.safeParse({
      complaintId: id,
      response: input.response,
      comment: input.comment?.trim() || undefined,
      rating: input.rating,
      location: input.location,
      point: input.point,
      evidenceIds: input.photos.map((uri) => `local:${uri}`),
    });
    if (!parsed.success) throw new ServiceError('INVALID', parsed.error.issues[0]?.message);

    const list = await loadMine();
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ServiceError('NOT_FOUND');
    const current = list[index];
    if (current.status !== 'awaiting_confirmation') throw new ServiceError('INVALID_STATE');
    if (confirmationDaysLeft(current) <= 0) throw new ServiceError('EXPIRED');

    await delay(400 + input.photos.length * 400); // simulated photo upload

    const now = new Date().toISOString();
    const next: ComplaintStatus = input.response === 'resolved' ? 'resolved' : 'reopened';
    const confirmation: MyConfirmation = {
      response: input.response,
      comment: parsed.data.comment,
      rating: input.rating,
      photos: input.photos,
      distanceM: current.point ? Math.round(distanceInMeters(current.point, input.point)) : undefined,
      locationMismatch: !isSameArea(current.location, input.location),
      at: now,
    };
    const updated: MyComplaint = {
      ...current,
      status: next,
      updatedAt: now,
      timeline: [...current.timeline, { status: next, at: now }],
      confirmations: [...current.confirmations, confirmation],
    };
    list[index] = updated;
    await saveMine(list);
        if (next === 'resolved') await scheduleFeedbackReminders(updated);
    return updated;
  },

  // Condition after the work: at 3, 6, 12 months, or a damage report at any time
  async feedback(id: string, input: FeedbackInput): Promise<MyComplaint> {
    if (!(await isOnline())) throw new ServiceError('NETWORK');
    if (input.conditionScore < 1 || input.conditionScore > 5) throw new ServiceError('INVALID');
    if (input.photos.length === 0 || input.damageTypes.length === 0) throw new ServiceError('INVALID');
    if (input.damageTypes.some((d) => !DAMAGE_TYPES.includes(d))) throw new ServiceError('INVALID');

    const list = await loadMine();
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ServiceError('NOT_FOUND');
    const current = list[index];
    if (current.status !== 'resolved' && current.status !== 'closed') throw new ServiceError('INVALID_STATE');

    if (input.period !== 'ad_hoc') {
      const window = complaintFeedbackWindows(current).find((w) => w.period === input.period);
      if (!window || window.state !== 'open') throw new ServiceError('EXPIRED');
      if (current.feedbacks.some((f) => f.period === input.period)) throw new ServiceError('ALREADY_SENT');
    }

    await delay(400 + input.photos.length * 400); // simulated photo upload

    const item: MyFeedback = {
      period: input.period,
      conditionScore: input.conditionScore,
      damageTypes: input.damageTypes,
      narrative: input.narrative?.trim() || undefined,
      photos: input.photos,
      distanceM: current.point ? Math.round(distanceInMeters(current.point, input.point)) : undefined,
      reviewStatus: 'pending',
      at: new Date().toISOString(),
    };
    const updated: MyComplaint = { ...current, feedbacks: [...current.feedbacks, item] };
    list[index] = updated;
    await saveMine(list);
    return updated;
  },

  // Development only: acts like an admin moving the complaint forward
  async simulateNext(id: string): Promise<MyComplaint> {
    const list = await loadMine();
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ServiceError('NOT_FOUND');
    const current = list[index];
    const next = NEXT_STATUS[current.status];
    if (!next) return current;
    const now = new Date().toISOString();
    const updated: MyComplaint = {
      ...current,
      status: next,
      updatedAt: now,
      timeline: [...current.timeline, { status: next, at: now }],
    };
    list[index] = updated;
    await saveMine(list);
        await notifyStatusChange(updated, next); // the backend will send this as a push notification
    return updated;
  },

  // Development only: pretends the work was confirmed some days earlier
  async simulateDaysPassed(id: string, days: number): Promise<MyComplaint> {
    const list = await loadMine();
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) throw new ServiceError('NOT_FOUND');
    const shift = days * DAY_MS;
    const current = list[index];
    const updated: MyComplaint = {
      ...current,
      timeline: current.timeline.map((e) =>
        e.status === 'resolved' || e.status === 'closed'
          ? { ...e, at: new Date(new Date(e.at).getTime() - shift).toISOString() }
          : e
      ),
    };
    list[index] = updated;
    await saveMine(list);
    return updated;
  },
};

function notReady(): never {
  throw new ServiceError('NETWORK', 'The real API is not connected yet.');
}

export const complaintsService = USE_MOCK_API
  ? mock
  : {
      submit: notReady,
      mine: notReady,
      get: notReady,
      confirm: notReady,
      feedback: notReady,
      simulateNext: notReady,
      simulateDaysPassed: notReady,
    };