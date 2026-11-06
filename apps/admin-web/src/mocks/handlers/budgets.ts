import { http, HttpResponse, delay } from 'msw';
import { MAX_COMPARE, MIN_COMPARE, calculateBudgetTotals } from '@civitrace/shared';
import type {
  AggregateAmount,
  BudgetOverview,
  Project,
  ProjectCompareItem,
  ProjectSummary,
} from '@civitrace/shared';
import { mockBudgets, mockProjects } from '../data/projects';
import { mockAssets } from '../data/assets';
import { getSessionUser } from './auth';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function visibleProjects() {
  const user = getSessionUser();
  if (!user) return null;
  if (user.role === 'area_admin') {
    const districts = user.assignedDistricts ?? [];
    return mockProjects.filter((p) => districts.includes(p.location.district));
  }
  return mockProjects;
}

const budgetsOf = (p: Project) =>
  mockBudgets.filter((b) => b.projectId === p.id).sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));

// Sum only the projects that have the value, and report how many were missing
function aggregate(values: (number | undefined)[]): AggregateAmount {
  const known = values.filter((v): v is number => v !== undefined);
  return {
    sum: known.reduce((t, v) => t + v, 0),
    counted: known.length,
    missing: values.length - known.length,
  };
}

export const budgetHandlers = [
  http.get('/api/v1/budgets/overview', async ({ request }) => {
    await delay(400);
    let projects = visibleProjects();
    if (!projects) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const district = params.get('district');
    const fiscalYear = params.get('fiscalYear');
    const fundingSource = params.get('fundingSource');

    const fiscalYears = [
      ...new Set(projects.flatMap((p) => budgetsOf(p).map((b) => b.fiscalYear))),
    ].sort().reverse();

    if (district) projects = projects.filter((p) => p.location.district === district);
    if (fundingSource) projects = projects.filter((p) => p.fundingSource === fundingSource);
    if (q) {
      projects = projects.filter((p) =>
        [p.projectCode, p.title, p.location.settlement.name].some((f) => f.toLowerCase().includes(q))
      );
    }

    // With a fiscal year filter, only that year's budget rows are counted
    const items: ProjectSummary[] = projects
      .map((p) => {
        const rows = budgetsOf(p).filter((b) => !fiscalYear || b.fiscalYear === fiscalYear);
        return { project: p, rows };
      })
      .filter(({ rows }) => !fiscalYear || rows.length > 0)
      .map(({ project, rows }) => ({ ...project, totals: calculateBudgetTotals(rows) }))
      .sort((a, b) => (b.totals.applicable ?? -1) - (a.totals.applicable ?? -1));

    const body: BudgetOverview = {
      items,
      fiscalYears,
      totals: {
        applicable: aggregate(items.map((i) => i.totals.applicable)),
        released: aggregate(items.map((i) => i.totals.released)),
        spent: aggregate(items.map((i) => i.totals.spent)),
      },
    };
    return HttpResponse.json(body);
  }),

  // Must be registered before "/projects/:id", otherwise "compare" is read as an id
  http.get('/api/v1/projects/compare', async ({ request }) => {
    await delay(400);
    const projects = visibleProjects();
    if (!projects) return errorResponse(401, 'NO_SESSION', 'Please sign in.');

    const ids = [...new Set((new URL(request.url).searchParams.get('ids') ?? '').split(',').filter(Boolean))];
    if (ids.length < MIN_COMPARE || ids.length > MAX_COMPARE) {
      return errorResponse(400, 'BAD_SELECTION', `Choose ${MIN_COMPARE} to ${MAX_COMPARE} projects to compare.`);
    }

    const found = ids.map((id) => projects.find((p) => p.id === id));
    if (found.some((p) => !p)) return errorResponse(404, 'NOT_FOUND', 'One or more projects were not found.');

    const items: ProjectCompareItem[] = (found as Project[]).map((project) => {
      const budgets = budgetsOf(project);
      return {
        project,
        totals: calculateBudgetTotals(budgets),
        fiscalYears: budgets.map((b) => b.fiscalYear),
        assetTypes: [
          ...new Set(
            project.assetIds
              .map((id) => mockAssets.find((a) => a.id === id)?.type)
              .filter((t) => t !== undefined)
          ),
        ],
      };
    });

    return HttpResponse.json({ items });
  }),
];