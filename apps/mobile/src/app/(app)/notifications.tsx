import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotifications, type AppNotification } from '../../store/notifications';
import { notificationText } from '../../lib/notify';
import { formatDateTime } from '../../lib/format';
import { AppText } from '../../components/AppText';
import { BackButton } from '../../components/BackButton';
import { colors } from '../../theme';

function Row({ item }: { item: AppNotification }) {
  useTranslation(); // re-render when the language changes
  const markRead = useNotifications((s) => s.markRead);
  const text = notificationText(item.kind, item.complaintNo, item.status);
  const icon = item.kind === 'sent' ? 'cloud-done-outline' : item.status === 'awaiting_confirmation' ? 'help-circle-outline' : 'refresh-circle-outline';

  return (
    <Pressable
      onPress={() => {
        markRead(item.id);
        if (item.complaintId) router.push({ pathname: '/complaints/[id]', params: { id: item.complaintId } });
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={colors.brand700} />
      </View>
      <View style={styles.body}>
        <AppText weight={item.read ? 'regular' : 'bold'} style={styles.title}>
          {text.title}
        </AppText>
        <AppText style={styles.text}>{text.body}</AppText>
        <AppText style={styles.date}>{formatDateTime(item.at)}</AppText>
      </View>
      {!item.read && <View style={styles.dot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const hasUnread = items.some((i) => !i.read);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Row item={item} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <BackButton />
            <View style={styles.headerRow}>
              <AppText weight="bold" style={styles.heading}>
                {t('notifications.title')}
              </AppText>
              {hasUnread && (
                <Pressable onPress={markAllRead} hitSlop={10} accessibilityRole="button">
                  <AppText style={styles.markAll}>{t('notifications.markAll')}</AppText>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.border} />
            <AppText style={styles.text}>{t('notifications.empty')}</AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 10 },
  header: { gap: 12, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 24 },
  markAll: { fontSize: 13, color: colors.brand700 },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.brand500 },
  pressed: { backgroundColor: colors.brand50 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15 },
  text: { fontSize: 13, color: colors.muted },
  date: { fontSize: 11, color: colors.muted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand600, marginTop: 6 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
});