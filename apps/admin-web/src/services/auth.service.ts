import type { LoginInput, PasswordChangeInput, ProfileUpdateInput, User } from '@civitrace/shared';
import { api } from './api';

type Session = { user: User; mustChangePassword: boolean };

export const authService = {
  login: (input: LoginInput) => api.post<Session>('/auth/login', input),
  me: () => api.get<Session>('/auth/me'),
  updateProfile: (input: ProfileUpdateInput) => api.patch<Session>('/auth/me', input),
  changePassword: (input: PasswordChangeInput) => api.post<{ ok: true }>('/auth/change-password', input),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};