import { formatRupees, formatRupeesCompact } from '@civitrace/shared';
import { NotAvailable } from './detail-field';

// Shows "Rs 2.5 crore"; hover shows the full amount
export function Money({ minor, className }: { minor?: number; className?: string }) {
  if (minor === undefined) return <NotAvailable />;
  return (
    <span className={className} title={formatRupees(minor)}>
      {formatRupeesCompact(minor)}
    </span>
  );
}