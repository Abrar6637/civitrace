import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { feedbackWindows, type ComplaintStatus } from '@civitrace/shared';
import i18n from '../i18n';
import { useNotifications } from '../store/notifications';

const CHANNEL_ID = 'updates';
const REMINDER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Show notifications even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Complaint updates',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// A phone notification now, or at a later date
async function show(title: string, body: string, complaintId?: string, at?: Date) {
  if (!useNotifications.getState().enabled) return;
  if (!(await ensureNotificationPermission())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: complaintId ? { complaintId } : {} },
      trigger: at
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID }
        : null,
    });
  } catch {
    // a failed phone notification must never break the app
  }
}

type ComplaintRef = { id: string; complaintNo: string };

export function notificationText(kind: 'status' | 'sent', complaintNo: string, status?: ComplaintStatus) {
  const title = i18n.t('notifications.complaintTitle', { number: complaintNo });
  if (kind === 'sent') return { title, body: i18n.t('notifications.sentBody') };
  if (status === 'awaiting_confirmation') return { title, body: i18n.t('notifications.confirmBody') };
  return { title, body: i18n.t('notifications.statusBody', { status: i18n.t(`statuses.${status}`) }) };
}

export async function notifyStatusChange(c: ComplaintRef, status: ComplaintStatus) {
  useNotifications.getState().add({ kind: 'status', complaintId: c.id, complaintNo: c.complaintNo, status });
  const text = notificationText('status', c.complaintNo, status);
  await show(text.title, text.body, c.id);

  // Remind the citizen if they have not answered after a few days
  if (status === 'awaiting_confirmation') {
    await show(
      text.title,
      i18n.t('notifications.reminderBody', { number: c.complaintNo }),
      c.id,
      new Date(Date.now() + REMINDER_DAYS * DAY_MS)
    );
  }
}

// After the citizen confirms the work: remind them at 3, 6 and 12 months
export async function scheduleFeedbackReminders(c: ComplaintRef) {
  const today = new Date().toISOString().slice(0, 10);
  for (const w of feedbackWindows(today)) {
    await show(
      i18n.t('notifications.complaintTitle', { number: c.complaintNo }),
      i18n.t('notifications.feedbackBody', { period: i18n.t(`periods.${w.period}`) }),
      c.id,
      new Date(`${w.opensAt}T10:00:00`)
    );
  }
}

// A complaint that waited for internet has been sent
export async function notifySent(c: ComplaintRef) {
  useNotifications.getState().add({ kind: 'sent', complaintId: c.id, complaintNo: c.complaintNo });
  const text = notificationText('sent', c.complaintNo);
  await show(text.title, text.body, c.id);
}