import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistance, nearbyService } from '../../../services/nearby.service';
import { errorKey } from '../../../services/config';
import { formatDateTime } from '../../../lib/format';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { colors } from '../../../theme';

// Another citizen's published complaint: no names, phone numbers or unchecked photos
export default function PublicComplaintScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['public-complaint', id], queryFn: () => nearbyService.get(id) });

  const support = useMutation({
    mutationFn: () => nearbyService.support(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['public-complaint', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['nearby'] });
    },
  });

  const c = query.data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        {query.isError && <AppText style={styles.error}>{t(errorKey(query.error))}</AppText>}
        {c && (
          <>
            <View style={styles.headerBox}>
              <AppText weight="bold" style={styles.title}>
                {t(`categories.${c.category}`)}
              </AppText>
              <AppText style={styles.number}>{c.complaintNo}</AppText>
              <StatusBadge status={c.status} />
              {c.isHazard && (
                <View style={styles.hazard}>
                  <Ionicons name="warning" size={14} color={colors.danger} />
                  <AppText style={styles.hazardText}>{t('complaints.hazard')}</AppText>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="navigate-outline" size={18} color={colors.brand700} />
                <AppText style={styles.value}>{formatDistance(c.distanceM, t)}</AppText>
              </View>
              {c.areaLabel !== '' && (
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={18} color={colors.brand700} />
                  <AppText style={styles.value}>{c.areaLabel}</AppText>
                </View>
              )}
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={18} color={colors.brand700} />
                <AppText style={styles.value}>{t('nearby.reportedOn', { date: formatDateTime(c.createdAt) })}</AppText>
              </View>
              <AppText style={styles.muted}>{t('nearby.photosNote')}</AppText>
            </View>

            <View style={[styles.card, styles.supportCard]}>
              <View style={styles.row}>
                <Ionicons name="people" size={22} color={colors.brand700} />
                <AppText weight="bold" style={styles.supportCount}>
                  {t('nearby.supporters', { count: c.supporters })}
                </AppText>
              </View>
              <AppText style={styles.muted}>{t('nearby.supportText')}</AppText>
              {support.error && <AppText style={styles.error}>{t(errorKey(support.error))}</AppText>}
              <Button
                title={c.supportedByMe ? t('nearby.supported') : t('nearby.support')}
                variant={c.supportedByMe ? 'secondary' : 'primary'}
                disabled={c.supportedByMe}
                loading={support.isPending}
                onPress={() => support.mutate()}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  headerBox: { gap: 6 },
  title: { fontSize: 24 },
  number: { fontSize: 14, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  hazard: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#fef2f2' },
  hazardText: { fontSize: 12, color: colors.danger },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  supportCard: { borderColor: colors.brand500 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flex: 1, fontSize: 15 },
  supportCount: { fontSize: 17 },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});