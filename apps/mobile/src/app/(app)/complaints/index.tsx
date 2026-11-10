import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { complaintsService, type MyComplaint } from '../../../services/complaints.service';
import { errorKey } from '../../../services/config';
import { useOutbox } from '../../../store/outbox';
import { useReportDraft } from '../../../store/report-draft';
import { formatDateTime } from '../../../lib/format';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { colors } from '../../../theme';

function ComplaintRow({ item }: { item: MyComplaint }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/complaints/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <AppText weight="bold" style={styles.category}>
          {t(`categories.${item.category}`)}
        </AppText>
        {item.isHazard && (
          <View style={styles.hazard}>
            <Ionicons name="warning" size={12} color={colors.danger} />
            <AppText style={styles.hazardText}>{t('complaints.hazard')}</AppText>
          </View>
        )}
      </View>
      <AppText style={styles.number}>{item.complaintNo}</AppText>
      <AppText style={styles.muted}>{`${item.location.settlement.name}، ${item.location.district}`}</AppText>
      <View style={styles.cardBottom}>
        <StatusBadge status={item.status} />
        <AppText style={styles.date}>{formatDateTime(item.updatedAt)}</AppText>
      </View>
    </Pressable>
  );
}

export default function ComplaintsScreen() {
  const { t } = useTranslation();
  const waiting = useOutbox((s) => s.items);
  const lastSent = useOutbox((s) => s.lastSent);
  const resetDraft = useReportDraft((s) => s.reset);

  const query = useQuery({ queryKey: ['my-complaints'], queryFn: complaintsService.mine, refetchOnMount: 'always' });

  // A complaint waiting for internet was just sent: show it in the list
  useEffect(() => {
    if (lastSent) void query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSent?.at]);

    const refresh = () => {
    void query.refetch();
  };

    let emptyView: React.JSX.Element | undefined;
  if (!query.isLoading) {
    if (query.isError) {
      emptyView = (
        <View style={styles.empty}>
          <AppText style={styles.muted}>{t(errorKey(query.error))}</AppText>
          <Button title={t('complaints.retry')} variant="secondary" onPress={refresh} />
        </View>
      );
    } else if (waiting.length === 0) {
      emptyView = (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.border} />
          <AppText style={styles.muted}>{t('complaints.empty')}</AppText>
          <Button
            title={t('complaints.emptyAction')}
            onPress={() => {
              resetDraft();
              router.push('/report/camera');
            }}
          />
        </View>
      );
    }
  }

  const header = (
    <View style={styles.header}>
      <BackButton />
      <AppText weight="bold" style={styles.title}>
        {t('complaints.title')}
      </AppText>
      {waiting.map((w) => (
        <View key={w.draft.draftId} style={[styles.card, styles.waitingCard]}>
          <View style={styles.cardTop}>
            <AppText weight="bold" style={styles.category}>
              {w.draft.category ? t(`categories.${w.draft.category}`) : '—'}
            </AppText>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.warningText} />
          </View>
          <AppText weight="bold" style={styles.waitingTitle}>
            {t('complaints.waiting')}
          </AppText>
          <AppText style={styles.waitingText}>{t('complaints.waitingText')}</AppText>
        </View>
      ))}
    </View>
  );

   return (
    <SafeAreaView style={styles.safe}>
      <FlatList<MyComplaint>
        data={query.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ComplaintRow item={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={refresh} colors={[colors.brand600]} />
        }
        ListEmptyComponent={emptyView}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  title: { fontSize: 24 },
  card: { gap: 4, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  pressed: { backgroundColor: colors.brand50 },
  waitingCard: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  waitingTitle: { fontSize: 14, color: colors.warningText },
  waitingText: { fontSize: 12, color: colors.warningText },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  category: { fontSize: 16, flexShrink: 1 },
  number: { fontSize: 13, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  hazard: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#fef2f2' },
  hazardText: { fontSize: 11, color: colors.danger },
  muted: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  date: { fontSize: 11, color: colors.muted },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 40 },
});