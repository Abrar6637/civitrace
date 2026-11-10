import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { VOICE_NOTE_MAX_SECONDS } from '@civitrace/shared';
import type { VoiceNote } from '../store/report-draft';
import { keepFile } from '../lib/media';
import { AppText } from './AppText';
import { colors } from '../theme';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

type Props = { value?: VoiceNote; onChange: (note: VoiceNote | undefined) => void };

export function VoiceNoteRecorder({ value, onChange }: Props) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(value?.uri ?? null);
  const playerStatus = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);

  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  async function start() {
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(t('report.details.micDenied'));
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError(t('report.details.voiceFailed'));
    }
  }

  async function stop() {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) onChange({ uri: keepFile(recorder.uri), durationSec: Math.max(1, seconds) });
    } catch {
      setError(t('report.details.voiceFailed'));
    }
  }

  // Stop automatically at the time limit
  useEffect(() => {
    if (recorderState.isRecording && seconds >= VOICE_NOTE_MAX_SECONDS) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.isRecording, seconds]);

  function togglePlay() {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration)) {
      player.seekTo(0);
    }
    player.play();
  }

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Ionicons name="mic-outline" size={20} color={colors.brand700} />
        <AppText weight="bold" style={styles.title}>
          {t('report.details.voiceTitle')}
        </AppText>
      </View>
      <AppText style={styles.hint}>{t('report.details.voiceHint')}</AppText>

      {recorderState.isRecording ? (
        <View style={styles.row}>
          <View style={styles.redDot} />
          <AppText style={styles.clock}>{`${clock(seconds)} / ${clock(VOICE_NOTE_MAX_SECONDS)}`}</AppText>
          <Pressable onPress={stop} accessibilityRole="button" style={[styles.action, styles.stop]}>
            <Ionicons name="stop" size={18} color={colors.white} />
            <AppText style={styles.actionTextLight}>{t('report.details.stop')}</AppText>
          </Pressable>
        </View>
      ) : value ? (
        <View style={styles.row}>
          <Pressable onPress={togglePlay} accessibilityRole="button" style={styles.action}>
            <Ionicons name={playerStatus.playing ? 'pause' : 'play'} size={18} color={colors.brand700} />
            <AppText style={styles.actionText}>
              {playerStatus.playing ? t('report.details.pause') : t('report.details.play')}
            </AppText>
          </Pressable>
          <AppText style={styles.clock}>{clock(value.durationSec)}</AppText>
          <Pressable
            onPress={() => {
              player.pause();
              onChange(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('report.details.deleteVoice')}
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={start} accessibilityRole="button" style={[styles.action, styles.record]}>
          <Ionicons name="mic" size={18} color={colors.white} />
          <AppText style={styles.actionTextLight}>{t('report.details.record')}</AppText>
        </Pressable>
      )}

      {error && <AppText style={styles.error}>{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15 },
  hint: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  clock: { flex: 1, fontSize: 15, writingDirection: 'ltr' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.brand50 },
  record: { backgroundColor: colors.brand600 },
  stop: { backgroundColor: colors.danger },
  actionText: { color: colors.brand700, fontSize: 14 },
  actionTextLight: { color: colors.white, fontSize: 14 },
  error: { fontSize: 13, color: colors.danger },
});