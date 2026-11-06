import type { ProjectCompareItem } from '../types/api';

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

export type UnitBasis = 'per_km' | 'per_sqm' | 'none';

export type ComparisonRow = {
  projectId: string;
  budgetPerUnit?: number; // applicable budget per unit (paisa)
  spentPerUnit?: number; // verified spent per unit, completed projects only (paisa)
};

export type ComparisonResult = {
  basis: UnitBasis;
  rows: ComparisonRow[];
  caveats: string[];
};

export const UNIT_LABELS: Record<UnitBasis, string> = {
  per_km: 'per km',
  per_sqm: 'per m²',
  none: '',
};

export const COMPARISON_DISCLAIMER =
  'Cost differences can have many causes, such as terrain, materials, scope, site conditions and prices in that year. This comparison is not a finding of wrongdoing.';

// Documentation 4.4: compare like-for-like only, and say clearly when that is not possible
export function compareProjects(items: ProjectCompareItem[]): ComparisonResult {
  const caveats: string[] = [];
  let basis: UnitBasis = 'per_km';

  // 1. Same kind of asset?
  const types = new Set(items.flatMap((i) => i.assetTypes));
  if (types.size !== 1) {
    basis = 'none';
    caveats.push('These projects cover different kinds of assets, so unit costs are not compared.');
  }

  // 2. Width: switch to cost per square meter when widths differ
  if (basis !== 'none') {
    const widths = items.map((i) => i.project.widthM);
    const known = widths.filter((w): w is number => w !== undefined);
    if (new Set(known).size > 1) {
      if (known.length === items.length) {
        basis = 'per_sqm';
        caveats.push('Widths differ, so cost is shown per square meter instead of per km.');
      } else {
        caveats.push('Widths differ and are missing for some projects, so cost per km may not be comparable.');
      }
    }
  }

  // 3. Length
  if (basis !== 'none' && items.some((i) => !i.project.lengthM)) {
    caveats.push('Length is not recorded for some projects, so their unit cost is Not available.');
  }

  // 4. Construction type
  const constructionTypes = new Set(
    items.map((i) => i.project.constructionType).filter((t): t is string => !!t)
  );
  if (constructionTypes.size > 1) {
    caveats.push('Construction types differ (for example asphalt and concrete), so unit costs are not directly comparable.');
  }

  // 5. Years
  const startYears = items
    .flatMap((i) => i.fiscalYears)
    .map((fy) => Number(fy.slice(0, 4)))
    .filter((y) => !Number.isNaN(y));
  if (startYears.length > 0 && Math.max(...startYears) - Math.min(...startYears) >= 2) {
    caveats.push('Budgets are from different years and are not adjusted for inflation.');
  }

  // 6. Completion
  if (items.some((i) => i.project.status !== 'completed')) {
    caveats.push('Some projects are not completed. Their spent figures are not final, so spent per unit is shown only for completed projects.');
  }

  // 7. Missing budget data
  if (items.some((i) => i.totals.applicable === undefined || i.totals.spent === undefined)) {
    caveats.push('Some budget figures are missing. They show as Not available and are not guessed.');
  }

  const rows: ComparisonRow[] = items.map(({ project: p, totals }) => {
    let size: number | undefined;
    if (basis === 'per_km' && p.lengthM) size = p.lengthM / 1000;
    if (basis === 'per_sqm' && p.lengthM && p.widthM) size = p.lengthM * p.widthM;

    return {
      projectId: p.id,
      budgetPerUnit: size && totals.applicable !== undefined ? Math.round(totals.applicable / size) : undefined,
      spentPerUnit:
        size && totals.spent !== undefined && p.status === 'completed'
          ? Math.round(totals.spent / size)
          : undefined,
    };
  });

  return { basis, rows, caveats };
}