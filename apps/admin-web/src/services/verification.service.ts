import type {
  BudgetVerifyInput,
  Complaint,
  FlagReviewInput,
  ProjectBudget,
  ResolutionConfirmation,
  VerificationQuery,
  VerificationQueue,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const verificationService = {
  queue: (query: VerificationQuery) => api.get<VerificationQueue>(`/verification${toQueryString(query)}`),

  assign: (complaintId: string, verifierId: string | null) =>
    api.post<{ complaint: Complaint }>(`/complaints/${complaintId}/assign`, { verifierId }),

  reviewConfirmation: (confirmationId: string, input: FlagReviewInput) =>
    api.post<{ confirmation: ResolutionConfirmation }>(`/confirmations/${confirmationId}/review`, input),

  verifyBudget: (projectId: string, budgetId: string, input: BudgetVerifyInput) =>
    api.post<{ budget: ProjectBudget }>(`/projects/${projectId}/budgets/${budgetId}/verify`, input),

  closeNoResponse: (complaintId: string) =>
    api.post<{ complaint: Complaint }>(`/complaints/${complaintId}/close-no-response`),
};