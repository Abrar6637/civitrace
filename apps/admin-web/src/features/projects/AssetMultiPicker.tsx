import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { ASSET_TYPE_LABELS, type Asset, type AssetSummary } from '@civitrace/shared';
import { assetsService } from '@/services/assets.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Input } from '@/components/ui/input';

type Props = {
  district: string;
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  initialAssets?: Asset[];
};

type AssetLabel = { assetCode: string; name: string };

export function AssetMultiPicker({ district, value, onChange, error, initialAssets = [] }: Props) {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);

  // Remember labels of selected assets, even when they are not in the current search results
  const [known, setKnown] = useState<Record<string, AssetLabel>>(() =>
    Object.fromEntries(initialAssets.map((a) => [a.id, { assetCode: a.assetCode, name: a.name }]))
  );

  const query = { district, q, pageSize: 50 };
  const { data, isLoading } = useQuery({
    queryKey: ['assets', query],
    queryFn: () => assetsService.list(query),
    enabled: !!district,
  });

  function toggle(a: AssetSummary) {
    if (value.includes(a.id)) {
      onChange(value.filter((id) => id !== a.id));
    } else {
      setKnown((k) => ({ ...k, [a.id]: { assetCode: a.assetCode, name: a.name } }));
      onChange([...value, a.id]);
    }
  }

  if (!district) {
    return <p className="text-sm text-slate-500">Choose a district first.</p>;
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const label = known[id]?.assetCode ?? id;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-700"
              >
                {label}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== id))}
                  aria-label={`Remove ${label}`}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search assets in ${district}`}
          aria-label="Search assets"
          className="pl-9"
        />
      </div>

      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        {isLoading && <li className="p-3 text-sm text-slate-500">Loading assets…</li>}
        {data && data.data.length === 0 && (
          <li className="p-3 text-sm text-slate-500">No assets found. Create one from a complaint first.</li>
        )}
        {data?.data.map((a) => (
          <li key={a.id}>
            <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={value.includes(a.id)}
                onChange={() => toggle(a)}
                className="mt-1 size-4 accent-brand-600"
              />
              <span className="min-w-0">
                <span className="block font-mono text-xs text-brand-700">{a.assetCode}</span>
                <span className="block text-sm text-slate-800">{a.name}</span>
                <span className="block text-xs text-slate-500">
                  {ASSET_TYPE_LABELS[a.type]} · {a.location.settlement.name}, {a.location.tehsil}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        The project location is taken from the first selected asset. Complaints on these assets are linked automatically.
      </p>
    </div>
  );
}