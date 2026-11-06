import type { ReportQuery, ReportSummary } from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const reportsService = {
  summary: (query: ReportQuery) => api.get<ReportSummary>(`/reports/summary${toQueryString(query)}`),
};