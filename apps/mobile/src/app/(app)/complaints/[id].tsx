import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RefreshControl } from 'react-native';
import { ErrorView, LoadingView } from '../../../components/StateViews';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoModal } from '../../../components/VideoModal';
import { FeedbackSection } from '../../../components/FeedbackSection';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ComplaintStatus } from '@civitrace/shared';
import { complaintsService, confirmationDaysLeft } from '../../../services/complaints.service';
import { USE_MOCK_API, errorKey } from '../../../services/config';
import { formatDateTime, formatLocation } from '../../../lib/format';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { VoicePlayer } from '../../../components/VoicePlayer';
import { colors } from '../../../theme';

// Main stages shown to the citizen, and which statuses belong to each
const STAGES: { key: ComplaintStatus; includes: ComplaintStatus[] }[] = [
  { key: 'submitted', includes: ['submitted', 'under_review'] },
  { key: 'published', includes: ['published'] },
  { key: 'routed', includes: ['routed', 'acknowledged', 'action_planned'] },
  { key: 'in_progress', includes: ['in_progress', 'reopened', 'awaiting_confirmation'] },
  { key: 'resolved', includes: ['resolved', 'closed'] },
];

const stageIndex = (s: ComplaintStatus) => STAGES.findIndex((st) => st.includes.includes(s));

export default function ComplaintDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(null);
    const [video, setVideo] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['my-complaint', id], queryFn: () => complaintsService.get(id) });

  const simulate = useMutation({
    mutationFn: () => complaintsService.simulateNext(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-complaint', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
    },
  });

   if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <BackButton />
          <LoadingView />
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <BackButton />
          <ErrorView message={t(errorKey(query.error))} onRetry={() => void query.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const c = query.data;
  const current = stageIndex(c.status);
  const rejected = c.status === 'rejected';
  const awaiting = c.status === 'awaiting_confirmation';
  const daysLeft = awaiting ? confirmationDaysLeft(c) : 0;
  const lastAnswer = c.confirmations[c.confirmations.length - 1];
  const photos = c.evidence.filter((e) => e.kind === 'photo');
  const videos = c.evidence.filter((e) => e.kind === 'video');
  const notified = [c.notifyMna && 'MNA', c.notifyMpa && 'MPA'].filter(Boolean).join('، ');
  const canSimulate = __DEV__ && USE_MOCK_API && !awaiting && !rejected && c.status !== 'closed';

  return (
    <SafeAreaView style={styles.safe}>
            <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            colors={[colors.brand600]}
          />
        }
      >
        <BackButton />

        {/* Header */}
        <View style={styles.headerBox}>
          <AppText weight="bold" style={styles.title}>
            {t(`categories.${c.category}`)}
          </AppText>
          <AppText style={styles.number}>{c.complaintNo}</AppText>
          <StatusBadge status={c.status} />
          <AppText style={styles.muted}>{t('complaint.submittedOn', { date: formatDateTime(c.createdAt) })}</AppText>
        </View>

        {/* Needs the citizen's answer */}
        {awaiting && (
          <View style={[styles.card, styles.confirmCard]}>
            <AppText weight="bold" style={styles.confirmTitle}>
              {t('complaint.confirmTitle')}
            </AppText>
            <AppText style={styles.confirmText}>{t('complaint.confirmText')}</AppText>
            <AppText style={styles.confirmText}>{t('confirm.windowNote', { days: daysLeft })}</AppText>
            {daysLeft > 0 && (
              <Button
                title={t('complaint.answer')}
                onPress={() => router.push({ pathname: '/confirm/[id]', params: { id: c.id } })}
              />
            )}
          </View>
        )}

        {/* The citizen's last answer */}
        {lastAnswer && (
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('complaint.yourAnswer')}
            </AppText>
            <AppText style={styles.value}>{t(`confirm.${lastAnswer.response}`)}</AppText>
            {lastAnswer.rating && (
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons key={n} name={n <= lastAnswer.rating! ? 'star' : 'star-outline'} size={16} color="#f59e0b" />
                ))}
              </View>
            )}
            {lastAnswer.comment && <AppText style={styles.muted}>{lastAnswer.comment}</AppText>}
            <ScrollView horizontal contentContainerStyle={styles.thumbs} showsHorizontalScrollIndicator={false}>
              {lastAnswer.photos.map((uri) => (
                <Pressable key={uri} onPress={() => setPhoto(uri)} accessibilityRole="imagebutton">
                  <Image source={{ uri }} style={styles.thumbSmall} />
                </Pressable>
              ))}
            </ScrollView>
            {lastAnswer.distanceM !== undefined && (
              <AppText style={styles.muted}>{t('complaint.distanceShort', { meters: lastAnswer.distanceM })}</AppText>
            )}
            {lastAnswer.locationMismatch && (
              <View style={styles.warnBox}>
                <Ionicons name="warning-outline" size={16} color={colors.warningText} />
                <AppText style={styles.warnText}>{t('complaint.flagged')}</AppText>
              </View>
            )}
            <AppText style={styles.date}>{formatDateTime(lastAnswer.at)}</AppText>
          </View>
        )}

                <FeedbackSection complaint={c} />

        {rejected && (
          <View style={[styles.card, styles.rejectedCard]}>
            <AppText style={styles.rejectedText}>{t('complaint.rejectedText')}</AppText>
          </View>
        )}

        {/* Progress */}
        {!rejected && (
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('complaint.progress')}
            </AppText>
            {STAGES.map((stage, i) => {
              const done = i < current || (i === current && (stage.key === 'resolved' || c.status === stage.key));
              const active = i === current;
              return (
                <View key={stage.key} style={styles.stage}>
                  <View style={styles.stageRail}>
                    <View style={[styles.dot, (done || active) && styles.dotOn]}>
                      {done && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    </View>
                    {i < STAGES.length - 1 && <View style={[styles.line, i < current && styles.lineOn]} />}
                  </View>
                  <AppText
                    weight={active ? 'bold' : 'regular'}
                    style={[styles.stageText, !(done || active) && styles.stageTextOff]}
                  >
                    {active ? t(`statuses.${c.status}`) : t(`statuses.${stage.key}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {/* Evidence */}
        <View style={styles.card}>
          <AppText weight="bold" style={styles.cardTitle}>
            {t('complaint.evidence')}
          </AppText>
          <ScrollView horizontal contentContainerStyle={styles.thumbs} showsHorizontalScrollIndicator={false}>
            {photos.map((p) => (
              <Pressable key={p.uri} onPress={() => setPhoto(p.uri)} accessibilityRole="imagebutton">
                <Image source={{ uri: p.uri }} style={styles.thumb} />
              </Pressable>
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
          {c.voiceNote && (
            <View style={styles.block}>
              <AppText style={styles.label}>{t('complaint.voiceNote')}</AppText>
              <VoicePlayer uri={c.voiceNote.uri} durationSec={c.voiceNote.durationSec} />
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.card}>
          {c.description && (
            <View style={styles.block}>
              <AppText style={styles.label}>{t('complaint.description')}</AppText>
              <AppText style={styles.value}>{c.description}</AppText>
            </View>
          )}
          <View style={styles.block}>
            <AppText style={styles.label}>{t('complaint.location')}</AppText>
            <AppText style={styles.value}>{formatLocation(c.location)}</AppText>
          </View>
          {notified !== '' && (
            <View style={styles.block}>
              <AppText style={styles.label}>{t('complaint.notified')}</AppText>
              <AppText style={styles.value}>{notified}</AppText>
            </View>
          )}
        </View>

        {/* History */}
        <View style={styles.card}>
          <AppText weight="bold" style={styles.cardTitle}>
            {t('complaint.history')}
          </AppText>
          {[...c.timeline].reverse().map((e, i) => (
            <View key={`${e.status}-${e.at}`} style={styles.event}>
              <View style={[styles.eventDot, i === 0 && styles.dotOn]} />
              <View style={styles.eventBody}>
                <AppText weight={i === 0 ? 'bold' : 'regular'} style={styles.value}>
                  {t(`statuses.${e.status}`)}
                </AppText>
                {e.note && <AppText style={styles.muted}>{e.note}</AppText>}
                <AppText style={styles.date}>{formatDateTime(e.at)}</AppText>
              </View>
            </View>
          ))}
        </View>

        <Button
          title={t('complaint.share')}
          variant="secondary"
          onPress={() => Share.share({ message: t('report.submitted.shareMessage', { number: c.complaintNo }) })}
        />

        {/* Development only: move the status forward like an admin would */}
        {canSimulate && (
          <Button title="Test: next status" variant="ghost" loading={simulate.isPending} onPress={() => simulate.mutate()} />
        )}
      </ScrollView>

      {/* Full-screen photo */}
      <Modal visible={!!photo} transparent animationType="fade" onRequestClose={() => setPhoto(null)}>
        <View style={styles.viewer}>
          {photo && <Image source={{ uri: photo }} style={styles.viewerImage} resizeMode="contain" />}
          <Pressable onPress={() => setPhoto(null)} style={styles.viewerClose} accessibilityLabel={t('complaint.close')}>
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
            {video && <VideoModal uri={video} onClose={() => setVideo(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  headerBox: { gap: 6 },
  title: { fontSize: 24 },
  number: { fontSize: 15, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15 },
  confirmCard: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  confirmTitle: { fontSize: 17, color: colors.warningText },
  confirmText: { fontSize: 14, color: colors.warningText },
  rejectedCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  rejectedText: { fontSize: 14, color: colors.danger },
  warnBox: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.warningBg },
  warnText: { flex: 1, fontSize: 13, color: colors.warningText },
  stars: { flexDirection: 'row', gap: 2 },
  stage: { flexDirection: 'row', gap: 12, minHeight: 40 },
  stageRail: { alignItems: 'center', width: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: colors.brand600, backgroundColor: colors.brand600 },
  line: { flex: 1, width: 2, backgroundColor: colors.border },
  lineOn: { backgroundColor: colors.brand600 },
  stageText: { flex: 1, fontSize: 14 },
  stageTextOff: { color: colors.muted },
  thumbs: { gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  thumbSmall: { width: 60, height: 60, borderRadius: 8 },
  videoThumb: { backgroundColor: colors.brand900, alignItems: 'center', justifyContent: 'center' },
  videoText: { color: colors.white, fontSize: 11 },
  block: { gap: 4 },
  label: { fontSize: 12, color: colors.muted },
  value: { fontSize: 15 },
  event: { flexDirection: 'row', gap: 10 },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8, backgroundColor: colors.border },
  eventBody: { flex: 1, gap: 2 },
  muted: { fontSize: 13, color: colors.muted },
  date: { fontSize: 11, color: colors.muted },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 48, right: 20, padding: 8 },
});