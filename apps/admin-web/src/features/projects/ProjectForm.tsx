import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  FUNDING_SOURCES,
  FUNDING_SOURCE_LABELS,
  MINOR_PER_RUPEE,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PUNJAB_DISTRICTS,
  projectInputSchema,
  projectUpdateInputSchema,
  type ProjectDetail,
  type ProjectFormValues,
  type ProjectInput,
} from '@civitrace/shared';
import { projectsService } from '@/services/projects.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AssetMultiPicker } from './AssetMultiPicker';

// Empty inputs become undefined, so unknown values show as "Not available"
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));
const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const toOptional = (v: unknown) => (v === '' ? undefined : v);

const EMPTY: ProjectFormValues = {
  title: '',
  scope: '',
  status: 'proposed',
  assetIds: [],
  budgets: [],
  changeReason: '',
};

const toRupees = (minor?: number) => (minor === undefined ? undefined : minor / MINOR_PER_RUPEE);

function toFormValues({ project: p, budgets }: ProjectDetail): ProjectFormValues {
  return {
    title: p.title,
    scope: p.scope,
    status: p.status,
    assetIds: p.assetIds,
    executingDepartment: p.executingDepartment,
    contractorName: p.contractor?.name,
    contractorRegistrationNo: p.contractor?.registrationNo,
    fundingSource: p.fundingSource,
    proposedAt: p.proposedAt,
    approvedAt: p.approvedAt,
    plannedStart: p.plannedStart,
    plannedEnd: p.plannedEnd,
    actualStart: p.actualStart,
    actualEnd: p.actualEnd,
    plannedProgressPct: p.plannedProgressPct,
    actualProgressPct: p.actualProgressPct,
    delayReason: p.delayReason,
    lengthM: p.lengthM,
    widthM: p.widthM,
    constructionType: p.constructionType,
    budgets: budgets.map((b) => ({
      id: b.id,
      fiscalYear: b.fiscalYear,
      approvedRupees: toRupees(b.approvedMinor),
      revisedRupees: toRupees(b.revisedMinor),
      releasedRupees: toRupees(b.releasedMinor),
      spentRupees: toRupees(b.spentMinor),
    })),
    changeReason: '',
  };
}

// e.g. 2026 → "2026-27"
function nextFiscalYear(existing: string[]) {
  const now = new Date();
  let start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; // FY starts in July
  const label = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  while (existing.includes(label(start))) start += 1;
  return label(start);
}

export function ProjectForm({ initial }: { initial?: ProjectDetail }) {
  const isEdit = !!initial;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const districtOptions: readonly string[] =
    user?.role === 'area_admin' ? (user.assignedDistricts ?? []) : PUNJAB_DISTRICTS;

  const [district, setDistrict] = useState(
    initial?.project.location.district ?? (districtOptions.length === 1 ? districtOptions[0]! : '')
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<ProjectFormValues, unknown, ProjectInput>({
    resolver: zodResolver(isEdit ? projectUpdateInputSchema : projectInputSchema),
    defaultValues: initial ? toFormValues(initial) : EMPTY,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'budgets' });
  const status = useWatch({ control, name: 'status' });

  const mutation = useMutation({
    mutationFn: (input: ProjectInput) =>
      initial ? projectsService.update(initial.project.id, input) : projectsService.create(input),
    onSuccess: ({ project }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['asset'] });
      navigate(`/projects/${project.id}`);
    },
  });

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  const hasErrors = isSubmitted && Object.keys(errors).length > 0;
  const needsReason = status === 'stalled' || status === 'cancelled';

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-6">
      {hasErrors && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Please fix the highlighted fields.
        </div>
      )}

      {/* Basic info */}
      <Card title="Basic information">
        <div className="space-y-4">
          <FormField label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              placeholder="e.g. Rehabilitation of Manga Mandi Main Road"
              invalid={!!errors.title}
              {...register('title')}
            />
          </FormField>
          <FormField label="Scope of work" htmlFor="scope" error={errors.scope?.message}>
            <Textarea
              id="scope"
              rows={3}
              placeholder="What will be built or repaired"
              invalid={!!errors.scope}
              {...register('scope')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register('status')}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={needsReason ? 'Status note (required)' : 'Status note'}
              htmlFor="delayReason"
              error={errors.delayReason?.message}
            >
              <Input
                id="delayReason"
                placeholder="Reason for delay, stall or cancellation"
                invalid={!!errors.delayReason}
                {...register('delayReason', { setValueAs: toText })}
              />
            </FormField>
          </div>
        </div>
      </Card>

      {/* Assets */}
      <Card title="Assets and location">
        <div className="space-y-4">
          <FormField label="District" htmlFor="district">
            <Select
              id="district"
              value={district}
              disabled={isEdit}
              onChange={(e) => {
                setDistrict(e.target.value);
                setValue('assetIds', [], { shouldValidate: isSubmitted });
              }}
            >
              <option value="">Choose a district</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
          <Controller
            name="assetIds"
            control={control}
            render={({ field, fieldState }) => (
              <AssetMultiPicker
                district={district}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
                initialAssets={initial?.assets}
              />
            )}
          />
        </div>
      </Card>

      {/* Contractor & funding */}
      <Card title="Department, contractor and funding">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Executing department" htmlFor="executingDepartment" error={errors.executingDepartment?.message}>
            <Input
              id="executingDepartment"
              placeholder="e.g. Communication & Works Department"
              {...register('executingDepartment', { setValueAs: toText })}
            />
          </FormField>
          <FormField label="Funding source" htmlFor="fundingSource" error={errors.fundingSource?.message}>
            <Select id="fundingSource" {...register('fundingSource', { setValueAs: toOptional })}>
              <option value="">Not available</option>
              {FUNDING_SOURCES.map((f) => (
                <option key={f} value={f}>
                  {FUNDING_SOURCE_LABELS[f]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Contractor name" htmlFor="contractorName" error={errors.contractorName?.message}>
            <Input
              id="contractorName"
              placeholder="As written on the work order"
              invalid={!!errors.contractorName}
              {...register('contractorName', { setValueAs: toText })}
            />
          </FormField>
          <FormField
            label="Contractor registration no."
            htmlFor="contractorRegistrationNo"
            error={errors.contractorRegistrationNo?.message}
          >
            <Input
              id="contractorRegistrationNo"
              placeholder="e.g. PEC number"
              {...register('contractorRegistrationNo', { setValueAs: toText })}
            />
          </FormField>
        </div>
      </Card>

      {/* Schedule */}
      <Card title="Schedule and progress">
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ['proposedAt', 'Proposed'],
              ['approvedAt', 'Approved'],
              ['plannedStart', 'Planned start'],
              ['plannedEnd', 'Planned end'],
              ['actualStart', 'Actual start'],
              ['actualEnd', status === 'completed' ? 'Actual end (required)' : 'Actual end'],
            ] as const
          ).map(([name, label]) => (
            <FormField key={name} label={label} htmlFor={name} error={errors[name]?.message}>
              <Input
                id={name}
                type="date"
                invalid={!!errors[name]}
                {...register(name, { setValueAs: toOptional })}
              />
            </FormField>
          ))}
          <FormField label="Planned progress (%)" htmlFor="plannedProgressPct" error={errors.plannedProgressPct?.message}>
            <Input
              id="plannedProgressPct"
              type="number"
              inputMode="numeric"
              placeholder="0–100"
              invalid={!!errors.plannedProgressPct}
              {...register('plannedProgressPct', { setValueAs: toNumber })}
            />
          </FormField>
          <FormField label="Actual progress (%)" htmlFor="actualProgressPct" error={errors.actualProgressPct?.message}>
            <Input
              id="actualProgressPct"
              type="number"
              inputMode="numeric"
              placeholder="0–100"
              invalid={!!errors.actualProgressPct}
              {...register('actualProgressPct', { setValueAs: toNumber })}
            />
          </FormField>
        </div>
      </Card>

      {/* Scope details */}
      <Card title="Scope details (for fair comparison)">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Length (meters)" htmlFor="lengthM" error={errors.lengthM?.message}>
            <Input
              id="lengthM"
              type="number"
              inputMode="decimal"
              invalid={!!errors.lengthM}
              {...register('lengthM', { setValueAs: toNumber })}
            />
          </FormField>
          <FormField label="Width (meters)" htmlFor="widthM" error={errors.widthM?.message}>
            <Input
              id="widthM"
              type="number"
              inputMode="decimal"
              invalid={!!errors.widthM}
              {...register('widthM', { setValueAs: toNumber })}
            />
          </FormField>
          <FormField label="Construction type" htmlFor="constructionType" error={errors.constructionType?.message}>
            <Input
              id="constructionType"
              placeholder="e.g. Asphalt carpeting"
              {...register('constructionType', { setValueAs: toText })}
            />
          </FormField>
        </div>
      </Card>

      {/* Budget rows */}
      <Card
        title="Budget by fiscal year"
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              append({ fiscalYear: nextFiscalYear((getValues('budgets') ?? []).map((b) => b.fiscalYear)) })
            }
          >
            <Plus className="size-4" aria-hidden />
            Add year
          </Button>
        }
      >
        {fields.length === 0 ? (
          <p className="text-sm text-slate-500">No budget rows. Add a fiscal year when an approved figure is available.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((row, i) => {
              const rowErrors = errors.budgets?.[i];
              return (
                <div key={row.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <FormField label="Fiscal year" htmlFor={`fy-${i}`} error={rowErrors?.fiscalYear?.message}>
                      <Input
                        id={`fy-${i}`}
                        placeholder="2025-26"
                        className="w-32"
                        invalid={!!rowErrors?.fiscalYear}
                        {...register(`budgets.${i}.fiscalYear`)}
                      />
                    </FormField>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} aria-label="Remove this year">
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        ['approvedRupees', 'Approved (Rs)'],
                        ['revisedRupees', 'Revised (Rs)'],
                        ['releasedRupees', 'Released (Rs)'],
                        ['spentRupees', 'Verified spent (Rs)'],
                      ] as const
                    ).map(([name, label]) => (
                      <FormField key={name} label={label} htmlFor={`${name}-${i}`} error={rowErrors?.[name]?.message}>
                        <Input
                          id={`${name}-${i}`}
                          type="number"
                          inputMode="numeric"
                          placeholder="Not available"
                          invalid={!!rowErrors?.[name]}
                          {...register(`budgets.${i}.${name}`, { setValueAs: toNumber })}
                        />
                      </FormField>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400">
              Enter whole rupees. Leave a value empty if it is not documented. Changed rows are marked "Under review" until a
              source document is attached.
            </p>
          </div>
        )}
      </Card>

      {/* Reason for change */}
      {isEdit && (
        <Card title="Reason for change">
          <FormField label="What changed and why (saved in the version history)" htmlFor="changeReason" error={errors.changeReason?.message}>
            <Textarea
              id="changeReason"
              rows={2}
              placeholder="e.g. Revised budget approved vide letter No. 412/2026"
              invalid={!!errors.changeReason}
              {...register('changeReason', { setValueAs: toText })}
            />
          </FormField>
        </Card>
      )}

      {serverError && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(initial ? `/projects/${initial.project.id}` : '/projects')}
        >
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}