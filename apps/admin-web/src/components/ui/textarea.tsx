import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean };

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2',
        invalid
          ? 'border-red-400 focus:ring-red-100'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
        className
      )}
      {...props}
    />
  );
}