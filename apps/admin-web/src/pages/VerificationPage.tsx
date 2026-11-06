import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import type { VerificationQueue } from '@civitrace/shared';
import { verificationService } from '@/services/verification.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BudgetQueue,
  ComplaintQueue,
  ConfirmationQueue,
  DocumentQueue,
  OverdueQueue,
} from '@/features/verification/QueueSections';

type Tab = keyof VerificationQueue['counts'];

const TABS: { id: Tab; label: string }[] = [
  { id: 'complaints', label: 'New complaints' },
  { id: 'confirmations', label: 'Confirmation checks' },
  { id: 'documents', label: 'Documents' },
  { id: 'budgets', label: 'Budget rows' },
  { id: 'overdue', label: 'Overdue replies' },
];

export default function VerificationPage() {
  const [tab, setTab] = useState<Tab>('complaints');
  const [assigned, setAssigned] = useState<'all' | 'me' | 'unassigned'>('all');

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['verification', assigned],
    queryFn: () => verificationService.queue({ assigned }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Verification</h1>
          <p className="text-sm text-slate-500">Everything waiting for an admin decision.</p>
        </div>
        {isFetching && !isLoading && (
          <LoaderCircle className="size-5 animate-spin text-slate-400" aria-label="Updating" />
        )}
      </div>

      {/* Tabs */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1" role="tablist">
          {TABS.map((t) => {
            const count = data?.counts[t.id];
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {t.label}
                {count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      tab === t.id ? 'bg-white/20' : count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">Could not load the verification queue.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && (
        <div role="tabpanel">
          {tab === 'complaints' && <ComplaintQueue data={data} assigned={assigned} onAssignedChange={setAssigned} />}
          {tab === 'confirmations' && <ConfirmationQueue data={data} />}
          {tab === 'documents' && <DocumentQueue data={data} />}
          {tab === 'budgets' && <BudgetQueue data={data} />}
          {tab === 'overdue' && <OverdueQueue data={data} />}
        </div>
      )}
    </div>
  );
}