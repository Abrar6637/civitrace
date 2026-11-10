import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOutbox } from '../store/outbox';
import { useSession } from '../store/session';

// Sends waiting complaints when the app opens and whenever internet comes back
export function useOutboxSync() {
  const token = useSession((s) => s.token);
  const process = useOutbox((s) => s.process);

  useEffect(() => {
    if (!token) return;
    void process(token);
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void process(token);
    });
    return unsubscribe;
  }, [token, process]);
}