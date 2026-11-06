import type { DashboardSummary } from '@civitrace/shared';
import { api } from './api';

export const dashboardService = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
};