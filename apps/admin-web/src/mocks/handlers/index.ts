import { authHandlers } from './auth';
import { evidenceHandlers } from './evidence';
import { complaintHandlers } from './complaints';
import { dashboardHandlers } from './dashboard';
import { assetHandlers } from './assets';
import { budgetHandlers } from './budgets';
import { projectHandlers } from './projects';
import { projectRecordHandlers } from './project-records';
import { fileHandlers } from './files';
import { userHandlers } from './users';
import { auditHandlers } from './audit';
import { verificationHandlers } from './verification';
import { feedbackHandlers } from './feedback';
import { reportHandlers } from './reports';

export const handlers = [
  ...authHandlers,
  ...evidenceHandlers,
  ...complaintHandlers,
  ...dashboardHandlers,
  ...assetHandlers,
  ...budgetHandlers, // before projects: contains /projects/compare
  ...projectHandlers,
  ...projectRecordHandlers,
  ...fileHandlers,
  ...userHandlers,
  ...auditHandlers,
  ...verificationHandlers,
  ...feedbackHandlers,
  ...reportHandlers,
];