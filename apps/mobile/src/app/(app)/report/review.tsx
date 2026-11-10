import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoModal } from '../../../components/VideoModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { draftData, useReportDraft } from '../../../store/report-draft';
import { useOutbox } from '../../../store/outbox';
import { useSession } from '../../../store/session';
import { complaintsService } from '../../../services/complaints.service';
import { ServiceError, errorKey } from '../../../services/config';
import { isOnline } from '../../../lib/network';
import { formatLocation } from '../../../lib/format';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { colors } from '../../../theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
  );
}

export default function ReviewScreen() {
  const { t } = useTranslation();
  const state = useReportDraft();
  const draft = draftData(state);
  const reset = useReportDraft((s) => s.reset);
  const token = useSession((s) => s.token);
  const enqueue = useOutbox((s) => s.enqueue);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const photos = draft.evidence.filter((e) => e.kind === 'photo');
  const videos = draft.evidence.filter((e) => e.kind === 'video');
    const [video, setVideo] = useState<string | null>(null);
  const loc = draft.location;

  const submit = useMutation({
    mutationFn: async () => {
      // No internet: keep it on the phone and send it later
      if (!(await isOnline())) {
        enqueue(draft);
        return { queued: true as const };
      }
      try {
        const complaint = await complaintsService.submit(token!, draft, setProgress);
        return { queued: false as const, complaintNo: complaint.complaintNo };
      } catch (err) {
        if (err instanceof ServiceError && err.code === 'NETWORK') {
          enqueue(draft);
          return { queued: true as const };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['my-complaints'] }); // keep "My complaints" fresh
      reset();
      router.replace(
        result.queued
          ? { pathname: '/report/submitted', params: { queued: '1' } }
          : { pathname: '/report/submitted', params: { complaintNo: result.complaintNo } }
      );
    },
  });

  const yesNo = (v: boolean) => (v ? t('report.review.yes') : t('report.review.no'));
  const notify = [draft.notifyMna && 'MNA', draft.notifyMpa && 'MPA'].filter(Boolean).join('، ') || t('report.review.none');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <AppText weight="bold" style={styles.title}>
          {t('report.review.title')}
        </AppText>

        {/* Evidence */}
        <View style={styles.card}>
          <AppText weight="bold" style={styles.cardTitle}>
            {t('report.review.evidence')}
          </AppText>
          <ScrollView horizontal contentContainerStyle={styles.thumbs} showsHorizontalScrollIndicator={false}>
            {photos.map((p) => (
              <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} />
            ))}
                        {videos.map((v) => (
              <Pressable
                key={v.uri}
                onPress={() => setVideo(v.uri)}
                accessibilityRole="button"
                style={[styles.thumb, styles.videoThumb]}
              >
                <Ionicons name="play-circle" size={30} color={colors.white} />
                <AppText style={styles.videoText}>{`${v.durationSec ?? 0}s`}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          {draft.voiceNote && (
            <View style={styles.voice}>
              <Ionicons name="mic" size={16} color={colors.brand700} />
              <AppText style={styles.muted}>
                {t('report.review.voiceNote', { seconds: draft.voiceNote.durationSec })}
              </AppText>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.card}>
          {draft.category && <Row label={t('report.review.categoryLabel')} value={t(`categories.${draft.category}`)} />}
          {draft.description.trim() !== '' && (
            <Row label={t('report.review.descriptionLabel')} value={draft.description.trim()} />
          )}
          {loc && <Row label={t('report.review.locationLabel')} value={formatLocation(loc)} />}
          {draft.lowConfidenceGps && (
            <View style={styles.voice}>
              <Ionicons name="warning-outline" size={16} color={colors.warningText} />
              <AppText style={styles.warning}>{t('report.review.gpsWeak')}</AppText>
            </View>
          )}
          <Row label={t('report.review.hazard')} value={yesNo(draft.isHazard)} />
          <Row label={t('report.review.notify')} value={notify} />
        </View>

        <AppText style={styles.muted}>{t('report.review.publicNote')}</AppText>

        {submit.isPending && progress > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <AppText style={styles.muted}>{t('report.review.uploading', { percent: Math.round(progress * 100) })}</AppText>
          </View>
        )}

        {submit.error && <AppText style={styles.error}>{t(errorKey(submit.error))}</AppText>}

        <Button title={t('report.review.submit')} onPress={() => submit.mutate()} loading={submit.isPending} />
      </ScrollView>
            {video && <VideoModal uri={video} onClose={() => setVideo(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24 },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15 },
  thumbs: { gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  videoThumb: { backgroundColor: colors.brand900, alignItems: 'center', justifyContent: 'center' },
  videoText: { color: colors.white, fontSize: 11 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { gap: 2 },
  rowLabel: { fontSize: 12, color: colors.muted },
  rowValue: { fontSize: 15 },
  muted: { fontSize: 13, color: colors.muted },
  warning: { fontSize: 13, color: colors.warningText },
  progressWrap: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.brand600 },
  error: { fontSize: 14, color: colors.danger },
});