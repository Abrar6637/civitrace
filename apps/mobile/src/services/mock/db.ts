import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@civitrace/shared';

// Mock "server" data. Saved on the phone so new accounts survive an app restart.
export type MockCitizen = { user: User; profileComplete: boolean };

const USERS_KEY = 'civitrace.mock.users';

const SEED: MockCitizen[] = [
  {
    profileComplete: true,
    user: {
      id: 'u_citizen_1',
      name: 'Bilal Ahmed',
      displayName: 'Bilal A.',
      phone: '+923000000101',
      role: 'citizen',
      locale: 'ur',
      status: 'active',
      createdAt: '2026-10-10T09:00:00.000Z',
    },
  },
];

export async function loadUsers(): Promise<MockCitizen[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as MockCitizen[]) : SEED;
}

export async function saveUsers(users: MockCitizen[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// OTP codes live in memory only, like a short-lived server cache
export type OtpEntry = { code: string; expiresAt: number; attempts: number; sentAt: number[] };
export const otpStore = new Map<string, OtpEntry>();

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));