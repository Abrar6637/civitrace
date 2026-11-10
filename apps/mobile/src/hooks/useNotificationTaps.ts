import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

// Tapping a phone notification opens that complaint (also when the app was closed)
export function useNotificationTaps() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const key = response.notification.request.identifier;
    if (handled.current === key) return;
    handled.current = key;

    const complaintId = response.notification.request.content.data?.complaintId;
    if (typeof complaintId === 'string') {
      router.push({ pathname: '/complaints/[id]', params: { id: complaintId } });
    }
  }, [response]);
}