import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

type Props = {
  issued: { name: string; email?: string; password: string } | null;
  onClose: () => void;
};

export function TemporaryPasswordDialog({ issued, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog
      open={!!issued}
      title="Temporary password"
      description={issued ? `For ${issued.name}${issued.email ? ` (${issued.email})` : ''}` : undefined}
      onClose={onClose}
    >
      {issued && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <KeyRound className="size-5 shrink-0 text-slate-400" aria-hidden />
            <code className="flex-1 select-all break-all font-mono text-lg tracking-wide text-slate-900">
              {issued.password}
            </code>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Share it privately, for example by phone. <strong className="font-medium">It will not be shown again.</strong>{' '}
            The user must set a new password after signing in.
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}