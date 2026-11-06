import type { ProjectBudget } from '../schemas/project';

export type BudgetTotals = {
  approved?: number; // original approved, all years
  applicable?: number; // revised where available, otherwise approved
  released?: number;
  spent?: number; // verified expenditure
  hasRevision: boolean;
  utilizationPct?: number; // spent / applicable x 100
  unspentAllocation?: number; // applicable - spent (NOT unspent cash)
  notReleased?: number; // applicable - released
  warnings: string[];
};

// Adds up a field only if every fiscal year has it; otherwise the total is unknown
function sum(values: (number | undefined)[]) {
  if (values.length === 0 || values.some((v) => v === undefined)) return undefined;
  return values.reduce<number>((total, v) => total + (v ?? 0), 0);
}

// Documentation 4.4: calculate only when inputs are available and consistent
export function calculateBudgetTotals(budgets: ProjectBudget[]): BudgetTotals {
  const warnings: string[] = [];
  if (budgets.length === 0) return { hasRevision: false, warnings };

  const hasRevision = budgets.some((b) => b.revisedMinor !== undefined);

  if (new Set(budgets.map((b) => b.currency)).size > 1) {
    warnings.push('Budget rows use different currencies, so totals are not calculated.');
    return { hasRevision, warnings };
  }

  const approved = sum(budgets.map((b) => b.approvedMinor));
  const applicable = sum(budgets.map((b) => b.revisedMinor ?? b.approvedMinor));
  const released = sum(budgets.map((b) => b.releasedMinor));
  const spent = sum(budgets.map((b) => b.spentMinor));

  if ([applicable, released, spent].some((v) => v === undefined)) {
    warnings.push('Some fiscal years are missing values. Affected totals show as Not available.');
  }

  const base = applicable !== undefined && applicable > 0 ? applicable : undefined;

  const utilizationPct =
    base !== undefined && spent !== undefined ? Math.round((spent / base) * 1000) / 10 : undefined;
  const unspentAllocation = base !== undefined && spent !== undefined ? base - spent : undefined;
  const notReleased = base !== undefined && released !== undefined ? base - released : undefined;

  if (base !== undefined && spent !== undefined && spent > base) {
    warnings.push(
      'Verified expenditure is higher than the applicable approved budget. Check the source documents before drawing any conclusion.'
    );
  }
  if (base !== undefined && released !== undefined && released > base) {
    warnings.push('Released funds are higher than the applicable approved budget. Check the source documents.');
  }

  return {
    approved,
    applicable,
    released,
    spent,
    hasRevision,
    utilizationPct,
    unspentAllocation,
    notReleased,
    warnings,
  };
}