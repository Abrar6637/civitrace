import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2',
        invalid
          ? 'border-red-400 focus:ring-red-100'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
        className
      )}
      {...props}
    />
  );
}