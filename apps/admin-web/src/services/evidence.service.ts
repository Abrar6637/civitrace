import type { EvidenceItem, EvidenceReviewInput } from '@civitrace/shared';
import { api } from './api';

export const evidenceService = {
  list: (complaintId: string) => api.get<{ items: EvidenceItem[] }>(`/complaints/${complaintId}/evidence`),

  review: (complaintId: string, evidenceId: string, input: EvidenceReviewInput) =>
    api.post<{ item: EvidenceItem }>(`/complaints/${complaintId}/evidence/${evidenceId}/review`, input),
};