import type { ComplaintCategory } from '../constants/complaint';
import type { Asset } from '../schemas/asset';
import type { Complaint, ComplaintEvent } from '../schemas/complaint';
import type { AssetType } from '../constants/asset';
import type { ProjectStatus } from '../constants/project';
import type { User } from '../schemas/user';
import type { FileRecord } from '../schemas/file';
import type { ConditionFeedback } from '../schemas/feedback';
import type {
  Milestone,
  Project,
  ProjectPhoto,
  ProjectBudget,
  ProjectDocument,
  RepresentativeInvolvement,
} from '../schemas/project';
import type { ResolutionConfirmation } from '../schemas/resolution';
import type { BudgetTotals } from '../utils/budget';

// Every list API responds in this shape
export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ComplaintListQuery = {
  q?: string;
  status?: string;
  category?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

// Full details of a single complaint
// Full details of a single complaint
export type ComplaintDetail = {
  complaint: Complaint;
  events: ComplaintEvent[];
  confirmation: ResolutionConfirmation | null;
  asset: Asset | null;
  duplicates: DuplicateCandidate[];
  mergedInto: { id: string; complaintNo: string } | null;
  mergedFrom: Complaint[];
};

export type AssetListQuery = {
  q?: string;
  type?: string;
  condition?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

// Asset plus numbers calculated from its complaints
export type AssetSummary = Asset & {
  totalComplaints: number;
  openComplaints: number;
  lastComplaintAt?: string;
  repeatIssue: boolean; // complaints soon after the last recorded work
};

export type AssetDetail = {
  asset: AssetSummary;
  complaints: Complaint[];
  projects: Project[];
};

// An asset suggested for linking to a complaint
export type NearbyAsset = AssetSummary & {
  distanceM: number | null; // null when either side has no GPS point
  sameType: boolean; // matches the complaint's category
};

export type ProjectListQuery = {
  q?: string;
  status?: string;
  fundingSource?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

export type ProjectSummary = Project & { totals: BudgetTotals };

export type ProjectDetail = {
  project: Project;
  totals: BudgetTotals;
  budgets: ProjectBudget[];
  milestones: Milestone[];
   documents: ProjectDocumentWithFile[];
  involvements: RepresentativeInvolvement[];
  assets: Asset[];
  complaints: Complaint[];
  history: ProjectVersion[];
    photos: ProjectPhotoWithFiles[];
      feedback: ConditionFeedback[];
};

// Admin dashboard numbers
export type DashboardSummary = {
  kpis: {
    newLast7Days: number;
    pendingReview: number;
    awaitingConfirmation: number;
    openHazards: number;
    resolvedLast30Days: number;
    reopened: number;
  };
  aging: { bucket: string; count: number }[];
  byCategory: { category: ComplaintCategory; count: number }[];
  byDistrict: {
    district: string;
    open: number;
    awaiting: number;
    resolved: number;
    total: number;
  }[];
  weekly: { weekStart: string; count: number }[];
  needsAttention: Complaint[];
};
// One changed field in a version
export type FieldChange = {
  field: string;
  before?: string;
  after?: string;
};

// Every create/edit of a project is kept as a version
export type ProjectVersion = {
  id: string;
  projectId: string;
  version: number;
  action: 'created' | 'updated';
  changedBy: string;
  changedAt: string;
  reason?: string;
  changes: FieldChange[];
};
export type BudgetOverviewQuery = {
  q?: string;
  district?: string;
  fiscalYear?: string;
  fundingSource?: string;
};

// A sum over projects, with how many projects had the value
export type AggregateAmount = {
  sum: number;
  counted: number;
  missing: number;
};

export type BudgetOverview = {
  items: ProjectSummary[];
  fiscalYears: string[];
  totals: {
    applicable: AggregateAmount;
    released: AggregateAmount;
    spent: AggregateAmount;
  };
};

export type ProjectCompareItem = {
  project: Project;
  totals: BudgetTotals;
  fiscalYears: string[];
  assetTypes: AssetType[];
};
export type ProjectDocumentWithFile = ProjectDocument & { file?: FileRecord };

export type ProjectPhotoWithFiles = ProjectPhoto & {
  file?: FileRecord; // public copy
  original?: FileRecord; // admins only
};

export type UserListQuery = {
  group?: 'admins' | 'citizens';
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type UserSummary = User & {
  lastLoginAt?: string;
  mustChangePassword: boolean;
  complaintCount: number;
};

export type AuditEntityType = 'user' | 'complaint' | 'asset' | 'project';

// One line in the audit log
export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "user.suspended"
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  summary: string;
  changes?: FieldChange[];
};

export type AuditListQuery = {
  q?: string;
  entityType?: string;
  actorId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
};

export type AuditListResponse = Paginated<AuditEntry> & {
  actors: { id: string; name: string }[];
};

export type ProjectRef = Pick<Project, 'id' | 'projectCode' | 'title'>;

export type VerificationQuery = {
  assigned?: 'all' | 'me' | 'unassigned';
};

export type VerificationQueue = {
  counts: {
    complaints: number;
    confirmations: number;
    documents: number;
    budgets: number;
    overdue: number;
  };
  complaints: Complaint[];
  confirmations: { confirmation: ResolutionConfirmation; complaint: Complaint }[];
  documents: { document: ProjectDocumentWithFile; project: ProjectRef }[];
  budgets: { budget: ProjectBudget; project: ProjectRef; verifiedDocuments: ProjectDocument[] }[];
  overdue: Complaint[];
  verifierNames: Record<string, string>; // admin id → name
};

// A complaint that may describe the same problem
export type DuplicateCandidate = Complaint & {
  distanceM: number | null; // null when either side has no GPS point
  sameAsset: boolean;
  sameCategory: boolean;
};
export type FeedbackListQuery = {
  status?: string;
  period?: string;
  district?: string;
  page?: number;
  pageSize?: number;
};

export type FeedbackItem = ConditionFeedback & {
  asset: Pick<Asset, 'id' | 'assetCode' | 'name' | 'location'>;
  project?: ProjectRef;
  reporterName: string; // public display name only
};

export type ReportQuery = {
  from?: string; // YYYY-MM-DD
  to?: string;
  district?: string;
};

export type ReportSummary = {
  districts: string[]; // districts covered by this report
  complaints: {
    received: number;
    open: number;
    resolvedConfirmed: number; // confirmed by the citizen
    closedNoResponse: number;
    rejected: number;
    merged: number;
    medianDaysToResolve?: number;
  };
  byCategory: { category: ComplaintCategory; received: number; open: number; resolvedConfirmed: number }[];
  byDistrict: {
    district: string;
    received: number;
    open: number;
    resolvedConfirmed: number;
    medianDaysToResolve?: number;
  }[];
  projects: {
    total: number;
    byStatus: { status: ProjectStatus; count: number }[];
    applicable: AggregateAmount;
    spent: AggregateAmount;
    acceptedFeedback: number;
    averageCondition?: number;
  };
};

// What the server returns after a citizen signs in
export type CitizenSession = {
  token: string;
  user: User;
  profileComplete: boolean;
};