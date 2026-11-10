import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_10_MIN,
  OTP_RESEND_SECONDS,
  normalizePakistaniMobile,
  type CitizenProfileInput,
  type CitizenSession,
  type User,
} from '@civitrace/shared';
import { ServiceError, USE_MOCK_API } from './config';
import { delay, loadUsers, otpStore, saveUsers } from './mock/db';

const DEV_CODE = '123456'; // mock only; the real backend sends an SMS

type OtpRequestResult = { phone: string; expiresInSeconds: number; devCode?: string };

// ---------- Mock implementation ----------

const mock = {
  async requestOtp(input: string): Promise<OtpRequestResult> {
    await delay(700);
    const phone = normalizePakistaniMobile(input);
    if (!phone) throw new ServiceError('PHONE_INVALID');

    const now = Date.now();
    const entry = otpStore.get(phone);
    const recent = (entry?.sentAt ?? []).filter((t) => now - t < 10 * 60_000);

    if (recent.length >= OTP_MAX_REQUESTS_PER_10_MIN) throw new ServiceError('TOO_MANY_REQUESTS');
    const last = recent.at(-1);
    if (last && now - last < OTP_RESEND_SECONDS * 1000) throw new ServiceError('RESEND_TOO_SOON');

    otpStore.set(phone, {
      code: DEV_CODE,
      expiresAt: now + OTP_EXPIRY_MINUTES * 60_000,
      attempts: 0,
      sentAt: [...recent, now],
    });
    return { phone, expiresInSeconds: OTP_EXPIRY_MINUTES * 60, devCode: DEV_CODE };
  },

  async verifyOtp(phone: string, code: string): Promise<CitizenSession> {
    await delay(700);
    const entry = otpStore.get(phone);
    if (!entry || entry.expiresAt < Date.now()) throw new ServiceError('CODE_EXPIRED');
    if (entry.attempts >= OTP_MAX_ATTEMPTS) throw new ServiceError('TOO_MANY_ATTEMPTS');
    if (entry.code !== code) {
      entry.attempts += 1;
      throw new ServiceError(entry.attempts >= OTP_MAX_ATTEMPTS ? 'TOO_MANY_ATTEMPTS' : 'CODE_WRONG');
    }
    otpStore.delete(phone);

    const users = await loadUsers();
    let record = users.find((r) => r.user.phone === phone);
    if (!record) {
      record = {
        profileComplete: false,
        user: {
          id: `u_c_${Date.now()}`,
          name: '',
          phone,
          role: 'citizen',
          locale: 'ur',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      };
      users.push(record);
      await saveUsers(users);
    }
    if (record.user.status !== 'active') throw new ServiceError('SUSPENDED');

    return { token: `mock.${record.user.id}`, user: record.user, profileComplete: record.profileComplete };
  },

  async me(token: string): Promise<CitizenSession> {
    await delay(300);
    const id = token.replace(/^mock\./, '');
    const record = (await loadUsers()).find((r) => r.user.id === id);
    if (!record || record.user.status !== 'active') throw new ServiceError('SESSION_EXPIRED');
    return { token, user: record.user, profileComplete: record.profileComplete };
  },

  async completeProfile(token: string, input: CitizenProfileInput): Promise<User> {
    await delay(500);
    const users = await loadUsers();
    const record = users.find((r) => r.user.id === token.replace(/^mock\./, ''));
    if (!record) throw new ServiceError('SESSION_EXPIRED');

    record.user = { ...record.user, name: input.name, displayName: input.displayName, locale: input.locale };
    record.profileComplete = true;
    await saveUsers(users);
    return record.user;
  },
};

// ---------- Public service (the real API is connected when the backend exists) ----------

function notReady(): never {
  throw new ServiceError('NETWORK', 'The real API is not connected yet.');
}

export const authService = USE_MOCK_API
  ? mock
  : {
      requestOtp: notReady,
      verifyOtp: notReady,
      me: notReady,
      completeProfile: notReady,
    };