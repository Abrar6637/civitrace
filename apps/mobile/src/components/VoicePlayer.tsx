import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colors } from '../theme';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function VoicePlayer({ uri, durationSec }: { uri: string; durationSec: number }) {
  const { t } = useTranslation();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) player.seekTo(0);
    player.play();
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} accessibilityRole="button" style={styles.button}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.brand700} />
        <AppText style={styles.text}>{status.playing ? t('report.details.pause') : t('report.details.play')}</AppText>
      </Pressable>
      <AppText style={styles.clock}>{`${clock(status.currentTime)} / ${clock(durationSec)}`}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.brand50 },
  text: { color: colors.brand700, fontSize: 14 },
  clock: { fontSize: 14, color: colors.muted, writingDirection: 'ltr' },
});