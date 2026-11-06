import { useState } from 'react';
import { Search } from 'lucide-react';
import { PUNJAB_DIVISIONS } from '@civitrace/shared';
import { Input } from '@/components/ui/input';

type Props = {
  value: string[];
  onChange: (districts: string[]) => void;
  error?: string;
};

export function DistrictMultiSelect({ value, onChange, error }: Props) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();

  const toggle = (d: string) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);

  const divisions = PUNJAB_DIVISIONS.map((div) => ({
    name: div.name,
    districts: div.districts.filter((d) => !term || d.toLowerCase().includes(term)),
  })).filter((div) => div.districts.length > 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search districts"
          aria-label="Search districts"
          className="pl-9"
        />
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
        {divisions.length === 0 && <p className="text-sm text-slate-500">No district matches.</p>}
        {divisions.map((div) => (
          <fieldset key={div.name}>
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {div.name} Division
            </legend>
            <div className="grid grid-cols-2 gap-1">
              {div.districts.map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={value.includes(d)}
                    onChange={() => toggle(d)}
                    className="size-4 accent-brand-600"
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {value.length === 0 ? 'No districts selected' : `Selected: ${value.join(', ')}`}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}