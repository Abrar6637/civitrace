import type {
  ConditionFeedback,
  FeedbackItem,
  FeedbackListQuery,
  FeedbackReviewInput,
  Paginated,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const feedbackService = {
  list: (query: FeedbackListQuery) => api.get<Paginated<FeedbackItem>>(`/feedback${toQueryString(query)}`),

  review: (id: string, input: FeedbackReviewInput) =>
    api.post<{ feedback: ConditionFeedback }>(`/feedback/${id}/review`, input),
};