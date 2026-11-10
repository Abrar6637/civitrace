import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EVIDENCE_LIMITS } from '@civitrace/shared';

import { useReportDraft } from '../../../store/report-draft';
import { compressPhoto, fileSize, keepFile } from '../../../lib/media';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { colors } from '../../../theme';

type Mode = 'picture' | 'video';

const clock = (s: number) => `0:${String(s).padStart(2, '0')}`;

export default function CameraScreen() {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('picture');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const evidence = useReportDraft((s) => s.evidence);
  const addEvidence = useReportDraft((s) => s.addEvidence);
  const removeEvidence = useReportDraft((s) => s.removeEvidence);

  const photoCount = evidence.filter((e) => e.kind === 'photo').length;
  const videoCount = evidence.filter((e) => e.kind === 'video').length;
  const photosFull = photoCount >= EVIDENCE_LIMITS.maxPhotos;
  const videosFull = videoCount >= EVIDENCE_LIMITS.maxVideos;

  // Recording timer
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Ionicons name="camera-outline" size={56} color={colors.brand600} />
        <AppText weight="bold" style={styles.permissionTitle}>
          {t('report.camera.permissionTitle')}
        </AppText>
        <AppText style={styles.permissionText}>{t('report.camera.permissionText')}</AppText>
        {permission.canAskAgain ? (
          <Button title={t('report.camera.allow')} onPress={requestPermission} />
        ) : (
          <Button title={t('report.camera.openSettings')} onPress={() => Linking.openSettings()} />
        )}
        <Button title={t('report.camera.close')} variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current || busy || photosFull) return;
    setBusy(true);
    setError(null);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.8, exif: false });
      const compressed = await compressPhoto(shot.uri);
      addEvidence({
        kind: 'photo',
        uri: compressed.uri,
        sizeBytes: compressed.sizeBytes,
        capturedAt: new Date().toISOString(),
      });
    } catch {
      setError(t('report.camera.photoFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (!cameraRef.current) return;
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    if (videosFull) return;

    setError(null);
    setElapsed(0);
    setRecording(true);
    const startedAt = Date.now();
    try {
      // Stops by itself at the time limit
      const result = await cameraRef.current.recordAsync({ maxDuration: EVIDENCE_LIMITS.maxVideoSeconds });
      if (result?.uri) {
        const sizeBytes = fileSize(result.uri);
        if (sizeBytes && sizeBytes > EVIDENCE_LIMITS.maxVideoBytes) {
          setError(t('report.camera.videoTooLarge'));
        } else {
          addEvidence({
            kind: 'video',
                        uri: keepFile(result.uri),
            sizeBytes,
            durationSec: Math.min(EVIDENCE_LIMITS.maxVideoSeconds, Math.max(1, Math.round((Date.now() - startedAt) / 1000))),
            capturedAt: new Date(startedAt).toISOString(),
          });
        }
      }
    } catch {
      setError(t('report.camera.videoFailed'));
    } finally {
      setRecording(false);
    }
  }

  const shutterDisabled = !ready || busy || (mode === 'picture' ? photosFull : videosFull && !recording);

  return (
    <View style={styles.black}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode={mode}
        mute // video without sound (privacy)
        onCameraReady={() => setReady(true)}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('report.camera.close')}
            disabled={recording}
          >
            <Ionicons name="close" size={30} color={colors.white} />
          </Pressable>
          <AppText style={styles.counts}>
            {t('report.camera.counts', {
              photos: photoCount,
              maxPhotos: EVIDENCE_LIMITS.maxPhotos,
              videos: videoCount,
              maxVideos: EVIDENCE_LIMITS.maxVideos,
            })}
          </AppText>
        </View>

        <View style={styles.hintBox}>
          <AppText style={styles.hint}>
            {mode === 'video'
              ? t('report.camera.videoHint', { seconds: EVIDENCE_LIMITS.maxVideoSeconds })
              : t('report.camera.hint')}
          </AppText>
        </View>

        <View style={styles.spacer} pointerEvents="none" />

        {recording && (
          <View style={styles.timer}>
            <View style={styles.redDot} />
            <AppText style={styles.timerText}>
              {`${clock(elapsed)} / ${clock(EVIDENCE_LIMITS.maxVideoSeconds)}`}
            </AppText>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        )}

        {/* Thumbnails */}
        {evidence.length > 0 && (
          <ScrollView horizontal contentContainerStyle={styles.thumbs} showsHorizontalScrollIndicator={false}>
            {evidence.map((e) => (
              <View key={e.id} style={styles.thumb}>
                {e.kind === 'photo' ? (
                  <Image source={{ uri: e.uri }} style={styles.thumbImage} />
                ) : (
                  <View style={[styles.thumbImage, styles.videoThumb]}>
                    <Ionicons name="videocam" size={22} color={colors.white} />
                    <AppText style={styles.videoLength}>{clock(e.durationSec ?? 0)}</AppText>
                  </View>
                )}
                <Pressable
                  onPress={() => removeEvidence(e.id)}
                  hitSlop={8}
                  accessibilityLabel={t('report.camera.remove')}
                  style={styles.removeButton}
                  disabled={recording}
                >
                  <Ionicons name="close" size={14} color={colors.text} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Mode switch */}
        <View style={styles.modes}>
          {(['picture', 'video'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              disabled={recording || busy}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
              style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            >
              <AppText style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === 'picture' ? t('report.camera.photo') : t('report.camera.video')}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Shutter and next */}
        <View style={styles.bottom}>
          <View style={styles.side} />
          <Pressable
            onPress={mode === 'picture' ? takePhoto : toggleRecording}
            disabled={shutterDisabled}
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'picture'
                ? t('report.camera.takePhoto')
                : recording
                  ? t('report.camera.stopRecording')
                  : t('report.camera.startRecording')
            }
            style={[styles.shutterRing, shutterDisabled && styles.disabled]}
          >
            <View
              style={[
                styles.shutter,
                mode === 'video' && styles.shutterVideo,
                recording && styles.shutterRecording,
              ]}
            />
          </Pressable>
          <View style={styles.side}>
            {evidence.length >= EVIDENCE_LIMITS.minItems && !recording && (
              <Pressable
                onPress={() => router.push('/report/location')}
                accessibilityRole="button"
                style={styles.nextButton}
              >
                <AppText weight="bold" style={styles.nextText}>
                  {t('report.camera.next')}
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1 },
  permission: { flex: 1, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'stretch', backgroundColor: colors.background },
  permissionTitle: { fontSize: 22, textAlign: 'center' },
  permissionText: { fontSize: 15, color: colors.muted, textAlign: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  counts: { color: colors.white, fontSize: 13 },
  hintBox: { marginHorizontal: 16, marginTop: 10, padding: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  hint: { color: colors.white, fontSize: 13, textAlign: 'center' },
  spacer: { flex: 1 },

  timer: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', marginBottom: 8 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  timerText: { color: colors.white, fontSize: 15, writingDirection: 'ltr' },

  errorBox: { marginHorizontal: 16, marginBottom: 8, padding: 8, borderRadius: 10, backgroundColor: colors.danger },
  errorText: { color: colors.white, fontSize: 13, textAlign: 'center' },

  thumbs: { gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  thumb: { width: 64, height: 64 },
  thumbImage: { width: 64, height: 64, borderRadius: 10, borderWidth: 2, borderColor: colors.white },
  videoThumb: { backgroundColor: colors.brand900, alignItems: 'center', justifyContent: 'center' },
  videoLength: { color: colors.white, fontSize: 11 },
  removeButton: { position: 'absolute', top: -6, end: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },

  modes: { flexDirection: 'row', alignSelf: 'center', gap: 6, padding: 4, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  modeButton: { paddingHorizontal: 16, paddingVertical: 2, borderRadius: 16 },
  modeButtonActive: { backgroundColor: colors.white },
  modeText: { color: colors.white, fontSize: 14 },
  modeTextActive: { color: colors.text },

  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  side: { width: 80, alignItems: 'center' },
  shutterRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  shutterVideo: { backgroundColor: colors.danger },
  shutterRecording: { width: 30, height: 30, borderRadius: 6 },
  disabled: { opacity: 0.4 },
  nextButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.brand600 },
  nextText: { color: colors.white, fontSize: 16 },
});