import { useQueryClient } from '@tanstack/react-query';

// After any queue action, refresh every screen that may show the changed record
export function useQueueRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['verification', 'complaints', 'complaint', 'dashboard', 'project', 'projects', 'budgets']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}