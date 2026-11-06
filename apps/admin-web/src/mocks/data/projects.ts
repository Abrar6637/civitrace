import { INVOLVEMENT_TYPES, PROJECT_DOCUMENT_TYPE_LABELS, districtCode } from '@civitrace/shared';
import type {
  Asset,
  AssetType,
  Contractor,
  FundingSource,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectBudget,
  ProjectDocument,
  ProjectDocumentType,
  ProjectStatus,
  RepresentativeInvolvement,
} from '@civitrace/shared';
import { mockAssets } from './assets';
import { mockComplaints } from './complaints';

function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(99);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) => min + rand() * (max - min);

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const fiscalYear = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;

// Rupees rounded to Rs 1,000, stored in paisa
const rupees = (n: number) => Math.round(n / 1000) * 1000 * 100;

// Sample names only (not real companies or people)
const CONTRACTORS: Contractor[] = [
  { id: 'k_1', name: 'Example Builders (Pvt) Ltd', registrationNo: 'PEC-C3-10001', verification: 'documented' },
  { id: 'k_2', name: 'Sample Roadworks Co.', registrationNo: 'PEC-C4-20417', verification: 'documented' },
  { id: 'k_3', name: 'Demo Infrastructure Pvt Ltd', verification: 'citizen_reported' },
];

const FUNDING: FundingSource[] = [
  'provincial_adp', 'provincial_adp', 'district_adp', 'federal_psdp', 'representative_scheme', 'donor',
];

const STATUS_POOL: ProjectStatus[] = [
  'proposed', 'approved', 'tendered', 'in_progress', 'in_progress', 'in_progress',
  'completed', 'completed', 'completed', 'stalled', 'cancelled',
];

const TITLES: Record<AssetType, (a: Asset) => string> = {
  road: (a) => `Rehabilitation of ${a.name}`,
  streetlight: (a) => `LED street light installation, ${a.location.settlement.name}`,
  drain: (a) => `Desilting and repair of ${a.name}`,
  water_line: (a) => `Replacement of ${a.name}`,
  bridge: (a) => `Reconstruction of ${a.name}`,
  other: (a) => `Improvement works, ${a.location.settlement.name}`,
};

const SCOPES: Record<AssetType, string> = {
  road: 'Removal of damaged surface, base course repair, asphalt carpeting and side drains.',
  streetlight: 'LED lights on existing poles, new cabling and timer panels.',
  drain: 'Desilting, repair of broken walls and new covers at road crossings.',
  water_line: 'Replacement of the old pipeline, new valves and house connections.',
  bridge: 'Demolition of the damaged culvert and construction of a new RCC culvert.',
  other: 'General improvement works as per the approved scheme.',
};

const MILESTONES: { title: string; doc?: ProjectDocumentType; offsetDays: number }[] = [
  { title: 'Administrative approval', doc: 'administrative_approval', offsetDays: 0 },
  { title: 'Technical sanction', doc: 'technical_sanction', offsetDays: 30 },
  { title: 'Tender awarded', doc: 'work_order', offsetDays: 75 },
  { title: 'Work started', offsetDays: 110 },
  { title: '50% work completed', offsetDays: 200 },
  { title: 'Work completed', doc: 'measurement_book', offsetDays: 300 },
  { title: 'Completion certificate issued', doc: 'completion_certificate', offsetDays: 330 },
];

// How many milestones are done for each status
const DONE_COUNT: Record<ProjectStatus, number> = {
  proposed: 0,
  approved: 2,
  tendered: 3,
  in_progress: 4,
  stalled: 4,
  completed: 7,
  cancelled: 2,
};

export const mockProjects: Project[] = [];
export const mockBudgets: ProjectBudget[] = [];
export const mockMilestones: Milestone[] = [];
export const mockDocuments: ProjectDocument[] = [];
export const mockInvolvements: RepresentativeInvolvement[] = [];

mockAssets.slice(0, 16).forEach((asset, i) => {
  const seq = String(i + 1).padStart(4, '0');
  const id = `p_${seq}`;
  const status = pick(STATUS_POOL);
  const year = rand() < 0.5 ? 2024 : 2025;
  const approvedAt = `${year}-0${1 + Math.floor(rand() * 6)}-15`;
  const doneCount = DONE_COUNT[status];
  const started = doneCount >= 4;

  // Milestones and their documents
  MILESTONES.forEach((m, k) => {
    const plannedAt = addDays(approvedAt, m.offsetDays);
    const done = k < doneCount;
    const isNext = k === doneCount;

    let mStatus: MilestoneStatus = done ? 'done' : 'pending';
    if (isNext && status === 'in_progress') mStatus = 'in_progress';
    if (isNext && status === 'stalled') mStatus = 'delayed';

    const actualAt = done ? addDays(plannedAt, Math.floor(rand() * 40)) : undefined;
    mockMilestones.push({ id: `${id}_m${k + 1}`, projectId: id, title: m.title, plannedAt, actualAt, status: mStatus });

    if (done && m.doc && actualAt) {
      const verified = rand() < 0.8;
      mockDocuments.push({
        id: `${id}_d${k + 1}`,
        projectId: id,
        documentType: m.doc,
        title: PROJECT_DOCUMENT_TYPE_LABELS[m.doc],
        issuer: asset.ownerDepartment,
        referenceNo: `No. ${100 + Math.floor(rand() * 900)}/${year}`,
        issuedAt: actualAt,
        verifiedBy: verified ? 'Abrar Hussain' : undefined,
        verifiedAt: verified ? addDays(actualAt, 5) : undefined,
      });
    }
  });

  // Budgets, one row per fiscal year
  const approvedTotal = rupees(between(2_000_000, 80_000_000));
  const years = status === 'proposed' ? [] : started && rand() < 0.5 ? [year, year + 1] : [year];
  const shares = years.length === 2 ? [0.6, 0.4] : [1];
  const releasedShare: Record<ProjectStatus, number> = {
    proposed: 0,
    approved: 0,
    tendered: 0.1,
    in_progress: between(0.5, 0.9),
    stalled: 0.3,
    completed: 1,
    cancelled: 0,
  };
  const released = releasedShare[status];
  const spentShare = status === 'completed' ? between(0.9, 1.05) : started ? between(0.6, 0.95) * released : 0;

  years.forEach((y, k) => {
    const approved = Math.round(approvedTotal * shares[k]!);
    const revised = rand() < 0.3 ? Math.round(approved * between(1.05, 1.25)) : undefined;
    const applicable = revised ?? approved;
    const spentMissing = rand() < 0.15;

    mockBudgets.push({
      id: `${id}_b${k + 1}`,
      projectId: id,
      fiscalYear: fiscalYear(y),
      currency: 'PKR',
      approvedMinor: approved,
      revisedMinor: revised,
      releasedMinor: Math.round(applicable * released),
      spentMinor: spentMissing ? undefined : Math.round(applicable * spentShare),
      verification: 'documented',
      sourceDocumentId: `${id}_d1`,
    });
  });

  if (released > 0) {
    mockDocuments.push({
      id: `${id}_rl`,
      projectId: id,
      documentType: 'release_letter',
      title: PROJECT_DOCUMENT_TYPE_LABELS.release_letter,
      issuer: 'Finance Department',
      referenceNo: `FD/${year}/${1000 + Math.floor(rand() * 9000)}`,
      issuedAt: addDays(approvedAt, 90),
    });
  }

  // Progress
  const plannedProgressPct = started ? (status === 'completed' ? 100 : Math.round(between(45, 90))) : undefined;
  const actualProgressPct =
    status === 'completed'
      ? 100
      : status === 'stalled'
        ? Math.round(between(15, 40))
        : status === 'in_progress'
          ? Math.max(5, plannedProgressPct! - Math.round(between(0, 25)))
          : undefined;

  let delayReason: string | undefined;
  if (status === 'stalled') delayReason = 'Second instalment of funds has not been released yet.';
  if (status === 'cancelled') delayReason = 'Scheme dropped in the revised development programme.';
  if (status === 'in_progress' && plannedProgressPct! - actualProgressPct! >= 10) {
    delayReason = 'Shifting of gas and water lines took longer than planned.';
  }

  // Representative involvement (only with a supporting document)
  const fundingSource = rand() < 0.85 ? pick(FUNDING) : undefined;
  if (doneCount >= 1 && (fundingSource === 'representative_scheme' || rand() < 0.25)) {
    mockInvolvements.push({
      id: `${id}_r1`,
      projectId: id,
      representativeName: 'Sample Representative',
      office: rand() < 0.5 ? 'MNA' : 'MPA',
      constituency: 'Sample constituency',
      involvementType: pick(INVOLVEMENT_TYPES),
      date: approvedAt,
      sourceDocumentId: `${id}_d1`,
    });
  }

  const milestoneDate = (title: string) =>
    mockMilestones.find((m) => m.projectId === id && m.title === title)?.actualAt;

  mockProjects.push({
    id,
    projectCode: `PRJ-${districtCode(asset.location.district)}-${year}-${seq}`,
    title: TITLES[asset.type](asset),
    scope: SCOPES[asset.type],
    status,
    assetIds: [asset.id],
    complaintIds: mockComplaints.filter((c) => c.assetId === asset.id).map((c) => c.id),
    location: asset.location,
    point: asset.point,
    executingDepartment: asset.ownerDepartment,
    contractor: doneCount >= 3 ? pick(CONTRACTORS) : undefined,
    fundingSource,
    proposedAt: addDays(approvedAt, -60),
    approvedAt: doneCount >= 1 ? approvedAt : undefined,
    plannedStart: addDays(approvedAt, 110),
    plannedEnd: addDays(approvedAt, 300),
    actualStart: started ? milestoneDate('Work started') : undefined,
    actualEnd: status === 'completed' ? milestoneDate('Work completed') : undefined,
    plannedProgressPct,
    actualProgressPct,
    delayReason,
    lengthM: asset.lengthM,
    widthM: asset.type === 'road' ? pick([3.6, 5.5, 7.3]) : undefined,
    constructionType:
      asset.type === 'road' ? pick(['Asphalt carpeting', 'Rigid pavement (concrete)', 'Tuff tiles']) : undefined,
    verification: doneCount >= 1 ? 'admin_verified' : 'under_review',
    lastVerifiedAt: doneCount >= 1 ? new Date(`${addDays(approvedAt, 20)}T10:00:00Z`).toISOString() : undefined,
    createdAt: new Date(`${addDays(approvedAt, -60)}T09:00:00Z`).toISOString(),
    updatedAt: new Date().toISOString(),
  });
});