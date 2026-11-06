import type { ProjectVersion } from '@civitrace/shared';
import { mockProjects } from './projects';

// Every sample project starts with a "created" version
export const mockVersions: ProjectVersion[] = mockProjects.map((p) => ({
  id: `${p.id}_v1`,
  projectId: p.id,
  version: 1,
  action: 'created',
  changedBy: 'Abrar Hussain',
  changedAt: p.createdAt,
  changes: [],
}));