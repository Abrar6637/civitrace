import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ReviewPeriod } from '@civitrace/shared';
import { complaintFeedbackWindows, complaintsService, type MyComplaint, type MyFeedback } from '../services/complaints.service';
import { USE_MOCK_API } from '../services/config';
import { formatDate } from '../lib/format';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors } from '../theme';

function SentLine({ feedback }: { feedback: MyFeedback }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sent}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons key={n} name={n <= feedback.conditionScore ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
        ))}
      </View>
      <AppText style={styles.muted}>
        {`${formatDate(feedback.at)} · ${t(`feedback.review.${feedback.reviewStatus}`)}`}
      </AppText>
    </View>
  );
}

// Shown on a resolved complaint: how the work holds up over time
export function FeedbackSection({ complaint: c }: { complaint: MyComplaint }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const passTime = useMutation({
    mutationFn: () => complaintsService.simulateDaysPassed(c.id, 92),
    onSuccess: (updated) => queryClient.setQueryData(['my-complaint', c.id], updated),
  });

  const windows = complaintFeedbackWindows(c);
  if (windows.length === 0) return null;

  const open = (period: ReviewPeriod) =>
    router.push({ pathname: '/feedback/[id]', params: { id: c.id, period } });

  const damageReports = c.feedbacks.filter((f) => f.period === 'ad_hoc');

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.title}>
        {t('feedback.cardTitle')}
      </AppText>
      <AppText style={styles.muted}>{t('feedback.cardText')}</AppText>

      {windows.map((w) => {
        const sent = c.feedbacks.find((f) => f.period === w.period);
        return (
          <View key={w.period} style={styles.row}>
            <View style={[styles.badge, (sent || w.state === 'open') && styles.badgeOn]}>
              <AppText style={[styles.badgeText, (sent || w.state === 'open') && styles.badgeTextOn]}>
                {t(`periods.${w.period}`)}
              </AppText>
            </View>
            <View style={styles.rowBody}>
              {sent ? (
                <SentLine feedback={sent} />
              ) : w.state === 'upcoming' ? (
                <AppText style={styles.muted}>{t('feedback.upcoming', { date: formatDate(w.opensAt) })}</AppText>
              ) : w.state === 'open' ? (
                <>
                  <AppText style={styles.openText}>{t('feedback.open', { date: formatDate(w.closesAt) })}</AppText>
                  <Button title={t('feedback.give')} onPress={() => open(w.period)} />
                </>
              ) : (
                <AppText style={styles.muted}>{t('feedback.closed')}</AppText>
              )}
            </View>
          </View>
        );
      })}

      {damageReports.length > 0 && (
        <View style={styles.adHoc}>
          <AppText style={styles.label}>{t('periods.ad_hoc')}</AppText>
          {damageReports.map((f) => (
            <SentLine key={f.at} feedback={f} />
          ))}
        </View>
      )}

      <Button title={t('feedback.damageReport')} variant="secondary" onPress={() => open('ad_hoc')} />

      {__DEV__ && USE_MOCK_API && (
        <Button title="Test: +3 months" variant="ghost" loading={passTime.isPending} onPress={() => passTime.mutate()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowBody: { flex: 1, gap: 8 },
  badge: { minWidth: 64, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  badgeOn: { backgroundColor: colors.brand50 },
  badgeText: { fontSize: 12, color: colors.muted },
  badgeTextOn: { color: colors.brand700 },
  openText: { fontSize: 13, color: colors.brand700 },
  sent: { gap: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  adHoc: { gap: 6 },
  label: { fontSize: 12, color: colors.muted },
  muted: { fontSize: 13, color: colors.muted },
});