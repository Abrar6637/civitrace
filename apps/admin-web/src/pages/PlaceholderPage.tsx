import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Construction className="size-8 text-slate-400" aria-hidden />
        <p className="text-sm text-slate-500">Yeh page jald banega.</p>
      </div>
    </div>
  );
}