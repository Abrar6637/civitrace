import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ComplaintCategory, GeoPoint, LocationRef } from '@civitrace/shared';

export type DraftEvidence = {
  id: string;
  kind: 'photo' | 'video';
  uri: string; // file on the phone until it is uploaded
  capturedAt: string;
  sizeBytes?: number;
  durationSec?: number;
};

export type VoiceNote = { uri: string; durationSec: number };

export type ReportDraft = {
  draftId: string;
  evidence: DraftEvidence[];
  point?: GeoPoint;
  lowConfidenceGps: boolean;
  location?: LocationRef;
  category?: ComplaintCategory;
  description: string;
  voiceNote?: VoiceNote;
  isHazard: boolean;
  notifyMna: boolean;
  notifyMpa: boolean;
};

type DetailsPatch = Partial<
  Pick<ReportDraft, 'category' | 'description' | 'voiceNote' | 'isHazard' | 'notifyMna' | 'notifyMpa'>
>;

type ReportDraftState = ReportDraft & {
  addEvidence: (item: Omit<DraftEvidence, 'id'>) => void;
  removeEvidence: (id: string) => void;
  setPoint: (point: GeoPoint | undefined, lowConfidence: boolean) => void;
  setLocation: (location: LocationRef) => void;
  setDetails: (patch: DetailsPatch) => void;
  reset: () => void;
};

const newDraft = (): ReportDraft => ({
  draftId: `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  evidence: [],
  point: undefined,
  lowConfidenceGps: false,
  location: undefined,
  category: undefined,
  description: '',
  voiceNote: undefined,
  isHazard: false,
  notifyMna: false,
  notifyMpa: false,
});

// Only the data, without the functions (for submitting or queueing)
export const draftData = (s: ReportDraftState): ReportDraft => ({
  draftId: s.draftId,
  evidence: s.evidence,
  point: s.point,
  lowConfidenceGps: s.lowConfidenceGps,
  location: s.location,
  category: s.category,
  description: s.description,
  voiceNote: s.voiceNote,
  isHazard: s.isHazard,
  notifyMna: s.notifyMna,
  notifyMpa: s.notifyMpa,
});

export const hasDraftContent = (d: ReportDraft) =>
  d.evidence.length > 0 || !!d.location || !!d.category || d.description.length > 0 || !!d.voiceNote;

// The complaint being written. Saved on the phone, so it survives closing the app.
export const useReportDraft = create<ReportDraftState>()(
  persist(
    (set) => ({
      ...newDraft(),
      addEvidence: (item) =>
        set((s) => ({ evidence: [...s.evidence, { ...item, id: `ev_${Date.now()}_${s.evidence.length}` }] })),
      removeEvidence: (id) => set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) })),
      setPoint: (point, lowConfidence) => set({ point, lowConfidenceGps: lowConfidence }),
      setLocation: (location) => set({ location }),
      setDetails: (patch) => set(patch),
      reset: () => set(newDraft()),
    }),
    { name: 'civitrace.draft', storage: createJSONStorage(() => AsyncStorage) }
  )
);