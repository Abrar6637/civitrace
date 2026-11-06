import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { projectsService } from '@/services/projects.service';
import { ProjectForm } from '@/features/projects/ProjectForm';

export default function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = !!id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsService.get(id!),
    enabled: isEdit,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to={isEdit ? `/projects/${id}` : '/projects'}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {isEdit ? 'Back to project' : 'All projects'}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isEdit ? `Edit ${data?.project.projectCode ?? 'project'}` : 'New project'}
        </h1>
        <p className="text-sm text-slate-500">
          Enter only what is backed by documents. Leave the rest empty; it will show as "Not available".
        </p>
      </div>

      {isEdit && isLoading && <div className="h-96 animate-pulse rounded-xl bg-slate-100" />}
      {isEdit && isError && <p className="text-sm text-red-600">Could not load this project.</p>}
      {(!isEdit || data) && <ProjectForm key={data?.project.updatedAt ?? 'new'} initial={data} />}
    </div>
  );
}