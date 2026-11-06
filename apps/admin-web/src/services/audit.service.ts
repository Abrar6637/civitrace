import type { AuditListQuery, AuditListResponse } from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const auditService = {
  list: (query: AuditListQuery) => api.get<AuditListResponse>(`/audit${toQueryString(query)}`),
};