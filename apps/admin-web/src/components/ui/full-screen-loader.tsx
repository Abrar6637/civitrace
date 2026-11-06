import { LoaderCircle } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <LoaderCircle className="size-8 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  );
}