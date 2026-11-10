import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ServiceError } from '../services/config';
import { notifySent } from '../lib/notify';
import { complaintsService } from '../services/complaints.service';
import type { ReportDraft } from './report-draft';

type OutboxItem = { draft: ReportDraft; queuedAt: string; attempts: number; lastError?: string };

type OutboxState = {
  items: OutboxItem[];
  sending: boolean;
  lastSent?: { complaintNo: string; at: string };
  enqueue: (draft: ReportDraft) => void;
  process: (token: string) => Promise<void>;
  dismissLastSent: () => void;
};

// Complaints waiting for internet. They are sent automatically, oldest first.
export const useOutbox = create<OutboxState>()(
  persist(
    (set, get) => ({
      items: [],
      sending: false,
      lastSent: undefined,

      enqueue: (draft) =>
        set((s) =>
          s.items.some((i) => i.draft.draftId === draft.draftId)
            ? s
            : { items: [...s.items, { draft, queuedAt: new Date().toISOString(), attempts: 0 }] }
        ),

      process: async (token) => {
        if (get().sending || get().items.length === 0) return;
        set({ sending: true });
        try {
          for (const item of [...get().items]) {
            try {
              const complaint = await complaintsService.submit(token, item.draft);
                            void notifySent(complaint);
              set((s) => ({
                items: s.items.filter((i) => i.draft.draftId !== item.draft.draftId),
                lastSent: { complaintNo: complaint.complaintNo, at: new Date().toISOString() },
              }));
            } catch (err) {
              if (err instanceof ServiceError && err.code === 'NETWORK') break; // still offline: try later
              set((s) => ({
                items: s.items.map((i) =>
                  i.draft.draftId === item.draft.draftId
                    ? { ...i, attempts: i.attempts + 1, lastError: err instanceof ServiceError ? err.code : 'UNKNOWN' }
                    : i
                ),
              }));
            }
          }
        } finally {
          set({ sending: false });
        }
      },

      dismissLastSent: () => set({ lastSent: undefined }),
    }),
    {
      name: 'civitrace.outbox',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items, lastSent: s.lastSent }),
    }
  )
);