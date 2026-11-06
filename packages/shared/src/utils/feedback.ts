import {
  FEEDBACK_WINDOW_DAYS,
  REVIEW_PERIODS,
  REVIEW_PERIOD_MONTHS,
  type DamageType,
  type ReviewPeriod,
  type ScheduledPeriod,
} from '../constants/feedback';
import type { ConditionFeedback } from '../schemas/feedback';

export type FeedbackWindow = {
  period: ScheduledPeriod;
  opensAt: string; // YYYY-MM-DD
  closesAt: string;
  state: 'upcoming' | 'open' | 'closed';
};

// When citizens can send 3, 6 and 12 month feedback after completion
export function feedbackWindows(completedAt: string, now = new Date()): FeedbackWindow[] {
  const today = now.toISOString().slice(0, 10);
  return (['3m', '6m', '12m'] as const).map((period) => {
    const opens = new Date(`${completedAt}T00:00:00Z`);
    opens.setUTCMonth(opens.getUTCMonth() + REVIEW_PERIOD_MONTHS[period]);
    const closes = new Date(opens);
    closes.setUTCDate(closes.getUTCDate() + FEEDBACK_WINDOW_DAYS);

    const opensAt = opens.toISOString().slice(0, 10);
    const closesAt = closes.toISOString().slice(0, 10);
    const state = today < opensAt ? 'upcoming' : today <= closesAt ? 'open' : 'closed';
    return { period, opensAt, closesAt, state };
  });
}

export type FeedbackSummary = {
  total: number;
  accepted: number;
  pending: number;
  averageScore?: number;
  byPeriod: { period: ReviewPeriod; count: number; averageScore?: number }[];
  commonDamage: { type: DamageType; count: number }[];
};

// Summary from ACCEPTED feedback only. It describes what citizens reported, nothing more.
export function summarizeFeedback(items: ConditionFeedback[]): FeedbackSummary {
  const accepted = items.filter((f) => f.reviewStatus === 'accepted');

  const average = (list: ConditionFeedback[]) =>
    list.length ? Math.round((list.reduce((t, f) => t + f.conditionScore, 0) / list.length) * 10) / 10 : undefined;

  const damage = new Map<DamageType, number>();
  for (const f of accepted) {
    for (const t of f.damageTypes) {
      if (t !== 'none') damage.set(t, (damage.get(t) ?? 0) + 1);
    }
  }

  return {
    total: items.length,
    accepted: accepted.length,
    pending: items.filter((f) => f.reviewStatus === 'pending').length,
    averageScore: average(accepted),
    byPeriod: REVIEW_PERIODS.map((period) => {
      const list = accepted.filter((f) => f.reviewPeriod === period);
      return { period, count: list.length, averageScore: average(list) };
    }),
    commonDamage: [...damage.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  };
}