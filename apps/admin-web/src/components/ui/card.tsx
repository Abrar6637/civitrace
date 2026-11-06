import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardProps = {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Card({ title, action, className, children }: CardProps) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}