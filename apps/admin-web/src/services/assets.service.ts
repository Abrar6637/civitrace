import type {
  AssetCreateInput,
  AssetDetail,
  AssetListQuery,
  AssetSummary,
  NearbyAsset,
  Paginated,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const assetsService = {
  list: (query: AssetListQuery) =>
    api.get<Paginated<AssetSummary>>(`/assets${toQueryString(query)}`),

  get: (id: string) => api.get<AssetDetail>(`/assets/${id}`),

  nearby: (complaintId: string) =>
    api.get<{ data: NearbyAsset[] }>(`/complaints/${complaintId}/nearby-assets`),

  create: (input: AssetCreateInput) => api.post<{ asset: AssetSummary }>('/assets', input),
};