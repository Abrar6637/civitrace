import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CONFIRMATION_MAX_DISTANCE_M,
  CONFIRMATION_RESPONSES,
  distanceInMeters,
  locationRefSchema,
  type GeoPoint,
} from '@civitrace/shared';
import { complaintsService, confirmationDaysLeft, type ConfirmationResponse } from '../../../services/complaints.service';
import { errorKey } from '../../../services/config';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { DistrictPicker } from '../../../components/DistrictPicker';
import { LivePhotoCapture } from '../../../components/LivePhotoCapture';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../theme';

const MAX_PHOTOS = 3;

type Gps = { state: 'locating' | 'found' | 'denied' | 'error'; point?: GeoPoint };
type Area = { district: string; tehsil: string; ucNumber: string; ucName: string; settlementName: string };
type Errors = Partial<Record<'response' | 'photos' | 'gps' | 'district' | 'tehsil' | 'uc' | 'settlement', string>>;

const RESPONSE_ICONS: Record<ConfirmationResponse, React.ComponentProps<typeof Ionicons>['name']> = {
  resolved: 'checkmark-circle-outline',
  partially_resolved: 'remove-circle-outline',
  not_resolved: 'close-circle-outline',
};

export default function ConfirmScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['my-complaint', id], queryFn: () => complaintsService.get(id) });

  const [response, setResponse] = useState<ConfirmationResponse | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [gps, setGps] = useState<Gps>({ state: 'locating' });
  const [area, setArea] = useState<Area>({ district: '', tehsil: '', ucNumber: '', ucName: '', settlementName: '' });
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [errors, setErrors] = useState<Errors>({});

  async function locate() {
    setGps({ state: 'locating' });
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setGps({ state: 'denied' });
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const accuracy = pos.coords.accuracy;
      setGps({
        state: 'found',
        point: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ...(accuracy != null ? { accuracyM: Math.round(accuracy) } : {}),
        },
      });
    } catch {
      setGps({ state: 'error' });
    }
  }

  useEffect(() => {
    void locate();
  }, []);

  const c = query.data;

  const send = useMutation({
    mutationFn: () =>
      complaintsService.confirm(id, {
        response: response!,
        comment,
        rating,
        photos,
        point: gps.point!,
        location: {
          country: 'PK',
          province: c!.location.province,
          district: area.district,
          tehsil: area.tehsil.trim(),
          unionCouncil: { number: area.ucNumber.trim() || undefined, name: area.ucName.trim() || undefined },
          settlement: { type: c!.location.settlement.type, name: area.settlementName.trim() },
        },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-complaint', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
      router.back();
    },
  });

  function onSubmit() {
    if (!c) return;
    const next: Errors = {};
    if (!response) next.response = t('confirm.responseRequired');
    if (photos.length === 0) next.photos = t('confirm.photoRequired');
    if (!gps.point) next.gps = t('confirm.gpsRequired');

    const check = locationRefSchema.safeParse({
      country: 'PK',
      province: c.location.province,
      district: area.district,
      tehsil: area.tehsil.trim(),
      unionCouncil: { number: area.ucNumber.trim() || undefined, name: area.ucName.trim() || undefined },
      settlement: { type: c.location.settlement.type, name: area.settlementName.trim() },
    });
    if (!check.success) {
      for (const issue of check.error.issues) {
        const key = issue.path[0];
        if (key === 'district') next.district = t('report.location.required');
        if (key === 'tehsil') next.tehsil = t('report.location.required');
        if (key === 'unionCouncil') next.uc = t('report.location.ucRequired');
        if (key === 'settlement') next.settlement = t('report.location.required');
      }
    }
    setErrors(next);
    if (Object.keys(next).length === 0) send.mutate();
  }

  if (!c) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <BackButton />
          {query.isError && <AppText style={styles.muted}>{t(errorKey(query.error))}</AppText>}
        </View>
      </SafeAreaView>
    );
  }

  const distance = gps.point && c.point ? Math.round(distanceInMeters(c.point, gps.point)) : undefined;
  const tooFar = distance !== undefined && distance > CONFIRMATION_MAX_DISTANCE_M;
  const setField = (key: keyof Area) => (value: string) => setArea((a) => ({ ...a, [key]: value }));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <AppText weight="bold" style={styles.title}>
            {t('confirm.title')}
          </AppText>
          <AppText style={styles.number}>{c.complaintNo}</AppText>
          <AppText style={styles.muted}>{t('confirm.windowNote', { days: confirmationDaysLeft(c) })}</AppText>

          {/* 1. Answer */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('confirm.question')}
            </AppText>
            {CONFIRMATION_RESPONSES.map((r) => {
              const selected = response === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setResponse(r);
                    setErrors((e) => ({ ...e, response: undefined }));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionActive]}
                >
                  <Ionicons name={RESPONSE_ICONS[r]} size={24} color={selected ? colors.brand700 : colors.muted} />
                  <AppText style={[styles.optionText, selected && styles.optionTextActive]}>{t(`confirm.${r}`)}</AppText>
                </Pressable>
              );
            })}
            {errors.response && <AppText style={styles.error}>{errors.response}</AppText>}
          </View>

          {/* 2. Live photos */}
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

          {/* 3. GPS */}
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
            {tooFar && (
              <View style={styles.warnBox}>
                <Ionicons name="warning-outline" size={18} color={colors.warningText} />
                <AppText style={styles.warnText}>{t('confirm.tooFar', { max: CONFIRMATION_MAX_DISTANCE_M })}</AppText>
              </View>
            )}
            {(gps.state === 'denied' || gps.state === 'error') && (
              <>
                <AppText style={styles.error}>
                  {gps.state === 'denied' ? t('confirm.gpsDenied') : t('confirm.gpsError')}
                </AppText>
                <Button title={t('confirm.retry')} variant="secondary" onPress={locate} />
              </>
            )}
            {errors.gps && !gps.point && <AppText style={styles.error}>{errors.gps}</AppText>}
          </View>

          {/* 4. Area, typed again by the citizen */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('confirm.areaTitle')}
            </AppText>
            <AppText style={styles.muted}>{t('confirm.areaHint')}</AppText>
            <DistrictPicker value={area.district || undefined} onChange={setField('district')} error={errors.district} />
            <TextField label={t('report.location.tehsil')} value={area.tehsil} onChangeText={setField('tehsil')} error={errors.tehsil} />
            <TextField
              label={t('report.location.ucNumber')}
              value={area.ucNumber}
              onChangeText={setField('ucNumber')}
              keyboardType="number-pad"
              ltr
            />
            <TextField
              label={t('report.location.ucName')}
              value={area.ucName}
              onChangeText={setField('ucName')}
              hint={t('report.location.ucHint')}
              error={errors.uc}
            />
            <TextField
              label={t('report.location.settlementName')}
              value={area.settlementName}
              onChangeText={setField('settlementName')}
              error={errors.settlement}
            />
          </View>

          {/* 5. Comment and rating */}
          <View style={styles.card}>
            <TextField
              label={t('confirm.comment')}
              placeholder={t('confirm.commentPlaceholder')}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              style={styles.comment}
            />
            {response && response !== 'not_resolved' && (
              <View style={styles.ratingBox}>
                <AppText style={styles.label}>{t('confirm.rating')}</AppText>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setRating(rating === n ? undefined : n)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${n}`}
                    >
                      <Ionicons name={rating && n <= rating ? 'star' : 'star-outline'} size={30} color="#f59e0b" />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {send.error && <AppText style={styles.error}>{t(errorKey(send.error))}</AppText>}

          <Button title={t('confirm.submit')} onPress={onSubmit} loading={send.isPending} />
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
  title: { fontSize: 24 },
  number: { fontSize: 14, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  optionActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  optionText: { flex: 1, fontSize: 15 },
  optionTextActive: { color: colors.brand700 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 86, height: 86, borderRadius: 10 },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand500, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addPhotoText: { fontSize: 11, color: colors.brand700 },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  ok: { fontSize: 14, color: colors.brand700 },
  warnBox: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.warningBg },
  warnText: { flex: 1, fontSize: 13, color: colors.warningText },
  comment: { minHeight: 80, textAlignVertical: 'top' },
  ratingBox: { gap: 6 },
  label: { fontSize: 13, color: colors.muted },
  stars: { flexDirection: 'row', gap: 8 },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});