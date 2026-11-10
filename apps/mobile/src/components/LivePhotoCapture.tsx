import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { compressPhoto } from '../lib/media';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors } from '../theme';

type Props = { visible: boolean; onClose: () => void; onCapture: (uri: string) => void };

// Full-screen camera for a single live photo. There is no gallery option.
export function LivePhotoCapture({ visible, onClose, onCapture }: Props) {
  const { t } = useTranslation();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take() {
    if (!camera.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.8 });
      if (shot) {
        const photo = await compressPhoto(shot.uri);
        onCapture(photo.uri);
        onClose();
      }
    } catch {
      setError(t('report.camera.photoFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {!permission?.granted ? (
        <SafeAreaView style={styles.permission}>
          <Ionicons name="camera-outline" size={48} color={colors.brand600} />
          <AppText weight="bold" style={styles.permissionTitle}>
            {t('report.camera.permissionTitle')}
          </AppText>
          <AppText style={styles.permissionText}>{t('report.camera.permissionText')}</AppText>
          {permission && !permission.canAskAgain ? (
            <Button title={t('report.camera.openSettings')} onPress={() => Linking.openSettings()} />
          ) : (
            <Button title={t('report.camera.allow')} onPress={requestPermission} />
          )}
          <Button title={t('report.camera.close')} variant="ghost" onPress={onClose} />
        </SafeAreaView>
      ) : (
        <View style={styles.flex}>
          <CameraView ref={camera} style={styles.flex} facing="back" />
          <SafeAreaView style={styles.bar} edges={['bottom']}>
            {error && <AppText style={styles.error}>{error}</AppText>}
            <View style={styles.row}>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('report.camera.close')}>
                <Ionicons name="close" size={30} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={take}
                disabled={busy}
                style={styles.shutter}
                accessibilityRole="button"
                accessibilityLabel={t('report.camera.takePhoto')}
              >
                {busy ? <ActivityIndicator color={colors.brand700} /> : <View style={styles.shutterInner} />}
              </Pressable>
              <View style={styles.spacer} />
            </View>
          </SafeAreaView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: colors.background },
  permissionTitle: { fontSize: 20, textAlign: 'center' },
  permissionText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
  spacer: { width: 30 },
  error: { color: colors.white, textAlign: 'center', marginBottom: 8 },
});