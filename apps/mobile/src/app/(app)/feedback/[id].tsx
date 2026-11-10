import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DAMAGE_TYPES, REVIEW_PERIODS, distanceInMeters, type DamageType, type ReviewPeriod } from '@civitrace/shared';
import { complaintsService } from '../../../services/complaints.service';
import { errorKey } from '../../../services/config';
import { useCurrentPosition } from '../../../hooks/useCurrentPosition';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { LivePhotoCapture } from '../../../components/LivePhotoCapture';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../theme';

const MAX_PHOTOS = 3;
type Errors = Partial<Record<'score' | 'damage' | 'photos' | 'gps', string>>;

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; period: string }>();
  const id = params.id;
  const period: ReviewPeriod = (REVIEW_PERIODS as readonly string[]).includes(params.period)
    ? (params.period as ReviewPeriod)
    : 'ad_hoc';
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['my-complaint', id], queryFn: () => complaintsService.get(id) });
  const gps = useCurrentPosition();

  const [score, setScore] = useState<number | undefined>();
  const [damage, setDamage] = useState<DamageType[]>([]);
  const [narrative, setNarrative] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const send = useMutation({
    mutationFn: () =>
      complaintsService.feedback(id, {
        period,
        conditionScore: score!,
        damageTypes: damage,
        narrative,
        photos,
        point: gps.point!,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-complaint', id], updated);
      router.back();
    },
  });

  // "No damage" cannot be combined with other choices
  function toggleDamage(d: DamageType) {
    setErrors((e) => ({ ...e, damage: undefined }));
    setDamage((current) => {
      if (d === 'none') return current.includes('none') ? [] : ['none'];
      const withoutNone = current.filter((x) => x !== 'none');
      return withoutNone.includes(d) ? withoutNone.filter((x) => x !== d) : [...withoutNone, d];
    });
  }

  function onSubmit() {
    const next: Errors = {};
    if (!score) next.score = t('feedback.scoreRequired');
    if (damage.length === 0) next.damage = t('feedback.damageRequired');
    if (photos.length === 0) next.photos = t('confirm.photoRequired');
    if (!gps.point) next.gps = t('confirm.gpsRequired');
    setErrors(next);
    if (Object.keys(next).length === 0) send.mutate();
  }

  const c = query.data;
  const distance = gps.point && c?.point ? Math.round(distanceInMeters(c.point, gps.point)) : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <AppText weight="bold" style={styles.title}>
            {period === 'ad_hoc' ? t('feedback.titleAdHoc') : `${t('feedback.title')} · ${t(`periods.${period}`)}`}
          </AppText>
          {c && <AppText style={styles.number}>{c.complaintNo}</AppText>}

          {/* Condition */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('feedback.scoreQuestion')}
            </AppText>
            {[5, 4, 3, 2, 1].map((n) => {
              const selected = score === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    setScore(n);
                    setErrors((e) => ({ ...e, score: undefined }));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionActive]}
                >
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name={s <= n ? 'star' : 'star-outline'} size={16} color="#f59e0b" />
                    ))}
                  </View>
                  <AppText style={[styles.optionText, selected && styles.optionTextActive]}>{t(`conditionScores.${n}`)}</AppText>
                </Pressable>
              );
            })}
            {errors.score && <AppText style={styles.error}>{errors.score}</AppText>}
          </View>

          {/* Damage */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('feedback.damageQuestion')}
            </AppText>
            <AppText style={styles.muted}>{t('feedback.damageHint')}</AppText>
            <View style={styles.chips}>
              {DAMAGE_TYPES.map((d) => {
                const selected = damage.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggleDamage(d)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <AppText style={[styles.chipText, selected && styles.chipTextActive]}>{t(`damageTypes.${d}`)}</AppText>
                  </Pressable>
                );
              })}
            </View>
            {errors.damage && <AppText style={styles.error}>{errors.damage}</AppText>}
          </View>

          {/* Live photos */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('confirm.photoTitle')}
            </AppText>
            <AppText style={styles.muted}>{t('confirm.photoHint', { max: MAX_PHOTOS })}</AppText>
            <View style={styles.thumbs}>
              {photos.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <Pressable
                    onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                    style={styles.remove}
                    hitSlop={8}
                    accessibilityLabel={t('report.camera.remove')}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Pressable onPress={() => setCameraOpen(true)} style={[styles.thumb, styles.addPhoto]} accessibilityRole="button">
                  <Ionicons name="camera" size={24} color={colors.brand700} />
                  <AppText style={styles.addPhotoText}>{t('confirm.addPhoto')}</AppText>
                </Pressable>
              )}
            </View>
            {errors.photos && <AppText style={styles.error}>{errors.photos}</AppText>}
          </View>

          {/* GPS */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('confirm.gpsTitle')}
            </AppText>
            {gps.state === 'locating' && <AppText style={styles.muted}>{t('confirm.locating')}</AppText>}
            {gps.state === 'found' && (
              <AppText style={styles.ok}>
                {distance !== undefined ? t('confirm.distance', { meters: distance }) : t('confirm.gpsFound')}
              </AppText>
            )}
            {(gps.state === 'denied' || gps.state === 'error') && (
              <>
                <AppText style={styles.error}>
                  {gps.state === 'denied' ? t('confirm.gpsDenied') : t('confirm.gpsError')}
                </AppText>
                <Button title={t('confirm.retry')} variant="secondary" onPress={gps.retry} />
              </>
            )}
            {errors.gps && !gps.point && <AppText style={styles.error}>{errors.gps}</AppText>}
          </View>

          <TextField
            label={t('feedback.narrative')}
            placeholder={t('feedback.narrativePlaceholder')}
            value={narrative}
            onChangeText={setNarrative}
            multiline
            maxLength={500}
            style={styles.narrative}
          />

          <AppText style={styles.muted}>{t('feedback.note')}</AppText>

          {send.error && <AppText style={styles.error}>{t(errorKey(send.error))}</AppText>}

          <Button title={t('feedback.submit')} onPress={onSubmit} loading={send.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>

      <LivePhotoCapture
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(uri) => {
          setPhotos((p) => [...p, uri].slice(0, MAX_PHOTOS));
          setErrors((e) => ({ ...e, photos: undefined }));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 22 },
  number: { fontSize: 14, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  optionActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  optionText: { flex: 1, fontSize: 15 },
  optionTextActive: { color: colors.brand700 },
  stars: { flexDirection: 'row', gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  chipText: { fontSize: 13 },
  chipTextActive: { color: colors.brand700 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 86, height: 86, borderRadius: 10 },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand500, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addPhotoText: { fontSize: 11, color: colors.brand700 },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  ok: { fontSize: 14, color: colors.brand700 },
  narrative: { minHeight: 80, textAlignVertical: 'top' },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});