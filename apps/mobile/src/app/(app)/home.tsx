import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../store/session';
import { draftData, hasDraftContent, useReportDraft, type ReportDraft } from '../../store/report-draft';
import { useOutbox } from '../../store/outbox';
import { selectUnreadCount, useNotifications } from '../../store/notifications';
import { AppText } from '../../components/AppText';
import { colors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type CardProps = { icon: IconName; title: string; text: string; onPress?: () => void; highlight?: boolean };

function ActionCard({ icon, title, text, onPress, highlight }: CardProps) {
  const { t } = useTranslation();
  const enabled = !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.cardHighlight,
        pressed && styles.cardPressed,
        !enabled && styles.cardDisabled,
      ]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={26} color={colors.brand700} />
      </View>
      <View style={styles.cardBody}>
        <AppText weight="bold" style={styles.cardTitle}>
          {title}
        </AppText>
        <AppText style={styles.cardText}>{text}</AppText>
      </View>
      {!enabled && <AppText style={styles.soon}>{t('common.soon')}</AppText>}
    </Pressable>
  );
}

// Continue from the first step that is not done yet
function resumeRoute(d: ReportDraft): Href {
  if (d.evidence.length === 0) return '/report/camera';
  if (!d.location) return '/report/location';
  if (!d.category) return '/report/details';
  return '/report/review';
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const draft = draftData(useReportDraft());
  const resetDraft = useReportDraft((s) => s.reset);
  const waiting = useOutbox((s) => s.items.length);
  const lastSent = useOutbox((s) => s.lastSent);
  const dismissLastSent = useOutbox((s) => s.dismissLastSent);
  const unread = useNotifications(selectUnreadCount);

  const name = user?.displayName || user?.name || '';
  const showDraft = hasDraftContent(draft);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {t('home.greeting', { name })}
            </AppText>
            <AppText style={styles.subtitle}>{t('home.subtitle')}</AppText>
          </View>

          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
              style={styles.iconButton}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.brand700} />
              {unread > 0 && (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</AppText>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('settings.title')}
              style={styles.iconButton}
            >
              <Ionicons name="settings-outline" size={24} color={colors.brand700} />
            </Pressable>
          </View>
        </View>

        {waiting > 0 && (
          <View style={[styles.banner, styles.bannerWarn]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.warningText} />
            <AppText style={styles.bannerWarnText}>{t('home.outboxWaiting', { count: waiting })}</AppText>
          </View>
        )}

        {lastSent && (
          <View style={[styles.banner, styles.bannerOk]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand700} />
            <AppText style={styles.bannerOkText}>{t('home.lastSent', { number: lastSent.complaintNo })}</AppText>
            <Pressable onPress={dismissLastSent} hitSlop={10} accessibilityRole="button">
              <AppText weight="bold" style={styles.bannerOkText}>
                {t('home.dismiss')}
              </AppText>
            </Pressable>
          </View>
        )}

        {showDraft && (
          <ActionCard
            icon="document-text-outline"
            title={t('home.continueDraft')}
            text={t('home.continueDraftText')}
            highlight
            onPress={() => router.push(resumeRoute(draft))}
          />
        )}

        <ActionCard
          icon="camera-outline"
          title={t('home.newComplaint')}
          text={t('home.newComplaintText')}
          onPress={() => {
            resetDraft();
            router.push('/report/camera');
          }}
        />
        <ActionCard
          icon="list-outline"
          title={t('home.myComplaints')}
          text={t('home.myComplaintsText')}
          onPress={() => router.push('/complaints')}
        />
        <ActionCard
          icon="location-outline"
          title={t('nearby.title')}
          text={t('nearby.homeText')}
          onPress={() => router.push('/nearby')}
        />

        <View style={styles.emergency}>
          <Ionicons name="call-outline" size={18} color={colors.danger} />
          <AppText style={styles.emergencyText}>{t('welcome.emergency')}</AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  header: { flex: 1, gap: 4 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 15, color: colors.muted },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14, color: colors.white, fontFamily: 'Inter_600SemiBold' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  bannerWarn: { backgroundColor: colors.warningBg },
  bannerWarnText: { flex: 1, fontSize: 13, color: colors.warningText },
  bannerOk: { backgroundColor: colors.brand50 },
  bannerOkText: { fontSize: 13, color: colors.brand700, flexShrink: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHighlight: { borderColor: colors.brand500 },
  cardPressed: { backgroundColor: colors.brand50 },
  cardDisabled: { opacity: 0.6 },
  cardIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17 },
  cardText: { fontSize: 13, color: colors.muted },
  soon: { fontSize: 11, color: colors.muted },
  emergency: { flexDirection: 'row', gap: 8, padding: 12, marginTop: 8, borderRadius: 12, backgroundColor: '#fef2f2' },
  emergencyText: { flex: 1, fontSize: 13, color: colors.danger },
});