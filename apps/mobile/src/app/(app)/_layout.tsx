import { Stack } from 'expo-router';
import { useOutboxSync } from '../../hooks/useOutboxSync';
import { useNotificationTaps } from '../../hooks/useNotificationTaps';

// Screens for signed-in citizens. Home opens first.
export const unstable_settings = { initialRouteName: 'home' };

export default function AppLayout() {
  useOutboxSync(); // sends saved complaints when internet is available
  useNotificationTaps(); // opens the complaint from a tapped notification
  return <Stack screenOptions={{ headerShown: false }} />;
}