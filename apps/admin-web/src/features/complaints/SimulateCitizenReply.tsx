import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import type { ConfirmationResponse } from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { Button } from '@/components/ui/button';

export function SimulateCitizenReply({ complaintId }: { complaintId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (response: ConfirmationResponse) =>
      complaintsService.simulateConfirmation(complaintId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-violet-800">
        <FlaskConical className="size-4" aria-hidden />
        Dev only: simulate the citizen's reply
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          loading={mutation.isPending && mutation.variables === 'resolved'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('resolved')}
        >
          Fixed
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="flex-1"
          loading={mutation.isPending && mutation.variables === 'not_resolved'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('not_resolved')}
        >
          Not fixed
        </Button>
      </div>
    </div>
  );
}