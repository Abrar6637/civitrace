import type {
  Complaint,
  ComplaintAssetLinkInput,
  ComplaintDetail,
  ComplaintListQuery,
  ConfirmationResponse,
  MergeInput,
  Paginated,
  StatusChangeInput,
  UnmergeInput,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const complaintsService = {
  list: (query: ComplaintListQuery) =>
    api.get<Paginated<Complaint>>(`/complaints${toQueryString(query)}`),

  get: (id: string) => api.get<ComplaintDetail>(`/complaints/${id}`),

  changeStatus: (id: string, input: StatusChangeInput) =>
    api.post<{ complaint: Complaint }>(`/complaints/${id}/status`, input),

  linkAsset: (id: string, input: ComplaintAssetLinkInput) =>
    api.post<{ complaint: Complaint }>(`/complaints/${id}/asset`, input),

  merge: (input: MergeInput) =>
    api.post<{ primary: Complaint; duplicate: Complaint }>('/complaints/merge', input),

  unmerge: (id: string, input: UnmergeInput) =>
    api.post<{ complaint: Complaint }>(`/complaints/${id}/unmerge`, input),

  // Development only: simulate the citizen's reply
  simulateConfirmation: (id: string, response: ConfirmationResponse) =>
    api.post<{ complaint: Complaint }>(`/complaints/${id}/confirmation`, { response }),
};