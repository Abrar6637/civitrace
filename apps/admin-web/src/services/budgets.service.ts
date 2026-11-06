import type { BudgetOverview, BudgetOverviewQuery, ProjectCompareItem } from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const budgetsService = {
  overview: (query: BudgetOverviewQuery) =>
    api.get<BudgetOverview>(`/budgets/overview${toQueryString(query)}`),

  compare: (ids: string[]) =>
    api.get<{ items: ProjectCompareItem[] }>(`/projects/compare?ids=${ids.map(encodeURIComponent).join(',')}`),
};