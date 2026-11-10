import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

// Full-screen player for an evidence video (recorded without sound)
export function VideoModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { t } = useTranslation();
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
        <SafeAreaView style={styles.closeWrap} edges={['top']}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel={t('complaint.close')}>
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  closeWrap: { position: 'absolute', top: 0, right: 0 },
  close: { margin: 16, padding: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
});