import type {
  AdminCreateInput,
  AdminUpdateInput,
  Paginated,
  SuspendInput,
  UserListQuery,
  UserSummary,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const usersService = {
  list: (query: UserListQuery) => api.get<Paginated<UserSummary>>(`/users${toQueryString(query)}`),

  create: (input: AdminCreateInput) =>
    api.post<{ user: UserSummary; temporaryPassword: string }>('/users', input),

  update: (id: string, input: AdminUpdateInput) => api.patch<{ user: UserSummary }>(`/users/${id}`, input),

  suspend: (id: string, input: SuspendInput) => api.post<{ user: UserSummary }>(`/users/${id}/suspend`, input),

  reactivate: (id: string) => api.post<{ user: UserSummary }>(`/users/${id}/reactivate`),

  resetPassword: (id: string) => api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
};