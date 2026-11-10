import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ComplaintStatus } from '@civitrace/shared';

export type AppNotification = {
  id: string;
  kind: 'status' | 'sent';
  complaintId?: string;
  complaintNo: string;
  status?: ComplaintStatus;
  at: string;
  read: boolean;
};

type NewNotification = Omit<AppNotification, 'id' | 'at' | 'read'>;

type NotificationsState = {
  items: AppNotification[];
  enabled: boolean; // show notifications on the phone
  add: (n: NewNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setEnabled: (enabled: boolean) => void;
};

const MAX_ITEMS = 100;

// The in-app list (bell icon). Text is built when shown, so it follows the app language.
export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      items: [],
      enabled: true,
      add: (n) =>
        set((s) => ({
          items: [
            { ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), read: false },
            ...s.items,
          ].slice(0, MAX_ITEMS),
        })),
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'civitrace.notifications', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export const selectUnreadCount = (s: NotificationsState) => s.items.filter((i) => !i.read).length;