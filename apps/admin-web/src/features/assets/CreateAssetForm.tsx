import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, MapPin } from 'lucide-react';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  CATEGORY_TO_ASSET_TYPE,
  assetCreateInputSchema,
  formatUnionCouncil,
  type AssetCreateFormValues,
  type AssetCreateInput,
  type Complaint,
} from '@civitrace/shared';
import { assetsService } from '@/services/assets.service';
import { ApiError } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type Props = {
  complaint: Complaint;
  onDone: () => void;
  onCancel: () => void;
};

// Empty input → undefined, so unknown values show as "Not available"
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));
const toText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function CreateAssetForm({ complaint, onDone, onCancel }: Props) {
  const loc = complaint.location;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetCreateFormValues, unknown, AssetCreateInput>({
    resolver: zodResolver(assetCreateInputSchema),
    defaultValues: {
      name: '',
      type: CATEGORY_TO_ASSET_TYPE[complaint.category] ?? 'other',
      location: loc,
      point: complaint.point,
      linkComplaintId: complaint.id,
    },
  });

  const mutation = useMutation({
    mutationFn: (input: AssetCreateInput) => assetsService.create(input),
    onSuccess: onDone,
  });

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
      <p className="text-sm font-medium text-slate-900">New asset</p>

      <FormField label="Name" htmlFor="asset-name" error={errors.name?.message}>
        <Input
          id="asset-name"
          placeholder={`e.g. ${loc.settlement.name} Main Road`}
          invalid={!!errors.name}
          {...register('name')}
        />
      </FormField>

      <FormField label="Type" htmlFor="asset-type" error={errors.type?.message}>
        <Select id="asset-type" {...register('type')}>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Built year" htmlFor="asset-built" error={errors.builtYear?.message}>
          <Input
            id="asset-built"
            type="number"
            inputMode="numeric"
            placeholder="Optional"
            invalid={!!errors.builtYear}
            {...register('builtYear', { setValueAs: toNumber })}
          />
        </FormField>
        <FormField label="Last work year" htmlFor="asset-work" error={errors.lastWorkYear?.message}>
          <Input
            id="asset-work"
            type="number"
            inputMode="numeric"
            placeholder="Optional"
            invalid={!!errors.lastWorkYear}
            {...register('lastWorkYear', { setValueAs: toNumber })}
          />
        </FormField>
      </div>

      <FormField label="Length (meters)" htmlFor="asset-length" error={errors.lengthM?.message}>
        <Input
          id="asset-length"
          type="number"
          inputMode="numeric"
          placeholder="Optional, for roads, drains and pipelines"
          invalid={!!errors.lengthM}
          {...register('lengthM', { setValueAs: toNumber })}
        />
      </FormField>

      <FormField label="Responsible department" htmlFor="asset-dept" error={errors.ownerDepartment?.message}>
        <Input
          id="asset-dept"
          placeholder="Optional, e.g. TMA, WASA"
          {...register('ownerDepartment', { setValueAs: toText })}
        />
      </FormField>

      <div className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
        <span>
          Location copied from the complaint: {loc.settlement.name}, {formatUnionCouncil(loc.unionCouncil)},{' '}
          {loc.tehsil}, {loc.district}.
        </span>
      </div>

      <p className="text-xs text-slate-400">Leave unknown fields empty. They will show as "Not available".</p>

      {errorMessage && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending} className="flex-1">
          Create and link
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}