import type {
  DocumentInput,
  Milestone,
  MilestoneInput,
  Paginated,
  PhotoInput,
  Project,
  ProjectDetail,
  ProjectDocument,
  ProjectInput,
  ProjectListQuery,
  ProjectPhoto,
  ProjectSummary,
} from '@civitrace/shared';
import { toQueryString } from '@/lib/query-string';
import { api } from './api';

export const projectsService = {
  list: (query: ProjectListQuery) =>
    api.get<Paginated<ProjectSummary>>(`/projects${toQueryString(query)}`),

  get: (id: string) => api.get<ProjectDetail>(`/projects/${id}`),

  create: (input: ProjectInput) => api.post<{ project: Project }>('/projects', input),

  update: (id: string, input: ProjectInput) => api.patch<{ project: Project }>(`/projects/${id}`, input),

  addDocument: (projectId: string, input: DocumentInput) =>
    api.post<{ document: ProjectDocument }>(`/projects/${projectId}/documents`, input),

  verifyDocument: (projectId: string, documentId: string) =>
    api.post<{ document: ProjectDocument }>(`/projects/${projectId}/documents/${documentId}/verify`),

  addMilestone: (projectId: string, input: MilestoneInput) =>
    api.post<{ milestone: Milestone }>(`/projects/${projectId}/milestones`, input),

  updateMilestone: (projectId: string, milestoneId: string, input: MilestoneInput) =>
    api.patch<{ milestone: Milestone }>(`/projects/${projectId}/milestones/${milestoneId}`, input),

  addPhoto: (projectId: string, input: PhotoInput) =>
    api.post<{ photo: ProjectPhoto }>(`/projects/${projectId}/photos`, input),
};