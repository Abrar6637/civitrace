import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { GPS_GOOD_ACCURACY_M, SETTLEMENT_TYPES, locationRefSchema, type SettlementType } from '@civitrace/shared';
import { useReportDraft } from '../../../store/report-draft';
import { guessDistrict } from '../../../lib/location';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { DistrictPicker } from '../../../components/DistrictPicker';
import { TextField } from '../../../components/TextField';
import { colors } from '../../../theme';

type GpsStatus = 'locating' | 'found' | 'weak' | 'denied' | 'error';

type LocationForm = {
  district: string;
  tehsil: string;
  ucNumber: string;
  ucName: string;
  settlementType: SettlementType;
  settlementName: string;
  address: string;
};

export default function LocationScreen() {
  const { t } = useTranslation();
  const point = useReportDraft((s) => s.point);
  const saved = useReportDraft((s) => s.location);
  const setPoint = useReportDraft((s) => s.setPoint);
  const setLocation = useReportDraft((s) => s.setLocation);

  const [gps, setGps] = useState<GpsStatus>(point ? 'found' : 'locating');
  const [canAsk, setCanAsk] = useState(true);

  const { control, handleSubmit, setValue, getValues, setError, formState: { errors } } = useForm<LocationForm>({
    defaultValues: {
      district: saved?.district ?? '',
      tehsil: saved?.tehsil ?? '',
      ucNumber: saved?.unionCouncil.number ?? '',
      ucName: saved?.unionCouncil.name ?? '',
      settlementType: saved?.settlement.type ?? 'village',
      settlementName: saved?.settlement.name ?? '',
      address: saved?.address ?? '',
    },
  });

  async function locate() {
    setGps('locating');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setCanAsk(permission.canAskAgain);
      setPoint(undefined, true);
      setGps('denied');
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const accuracy = Math.round(pos.coords.accuracy ?? 999);
      const weak = accuracy > GPS_GOOD_ACCURACY_M;
      setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: accuracy }, weak);
      setGps(weak ? 'weak' : 'found');

      // Suggest district and town from the phone's map data; the citizen confirms
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (place) {
          const district = guessDistrict([place.subregion, place.city, place.district, place.region]);
          if (district && !getValues('district')) setValue('district', district);
          if (place.city && !getValues('settlementName')) setValue('settlementName', place.city);
        }
      } catch {
        // suggestions are optional
      }
    } catch {
      setPoint(undefined, true);
      setGps('error');
    }
  }

  useEffect(() => {
    if (!point) locate();
    // run once when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNext = handleSubmit((v) => {
    const location = {
      country: 'PK',
      province: 'Punjab',
      district: v.district,
      tehsil: v.tehsil.trim(),
      unionCouncil: { number: v.ucNumber.trim() || undefined, name: v.ucName.trim() || undefined },
      settlement: { type: v.settlementType, name: v.settlementName.trim() },
      address: v.address.trim() || undefined,
    };

    const parsed = locationRefSchema.safeParse(location);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [first, second] = issue.path;
        if (first === 'district') setError('district', { message: t('report.location.required') });
        if (first === 'tehsil') setError('tehsil', { message: t('report.location.required') });
        if (first === 'unionCouncil') setError('ucNumber', { message: t('report.location.ucRequired') });
        if (first === 'settlement' && second === 'name') {
          setError('settlementName', { message: t('report.location.required') });
        }
      }
      return;
    }

    setLocation(parsed.data);
    router.push('/report/details');
  });

  const meters = point?.accuracyM ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />

          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {t('report.location.title')}
            </AppText>
            <AppText style={styles.subtitle}>{t('report.location.standHere')}</AppText>
          </View>

          {/* GPS status */}
          <View
            style={[
              styles.gpsBox,
              gps === 'found' && styles.gpsGood,
              (gps === 'weak' || gps === 'denied' || gps === 'error') && styles.gpsWarn,
            ]}
          >
            {gps === 'locating' ? (
              <ActivityIndicator color={colors.brand600} />
            ) : (
              <Ionicons
                name={gps === 'found' ? 'location' : 'warning-outline'}
                size={22}
                color={gps === 'found' ? colors.brand700 : colors.warningText}
              />
            )}
            <View style={styles.gpsBody}>
              <AppText style={styles.gpsText}>
                {gps === 'locating' && t('report.location.locating')}
                {gps === 'found' && t('report.location.found', { meters })}
                {gps === 'weak' && t('report.location.weak', { meters })}
                {gps === 'denied' && t('report.location.denied')}
                {gps === 'error' && t('report.location.error')}
              </AppText>
              {(gps === 'weak' || gps === 'error' || (gps === 'denied' && canAsk)) && (
                <Pressable onPress={locate} accessibilityRole="button">
                  <AppText weight="bold" style={styles.gpsAction}>
                    {gps === 'denied' ? t('report.location.allow') : t('report.location.retry')}
                  </AppText>
                </Pressable>
              )}
              {gps === 'denied' && !canAsk && (
                <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
                  <AppText weight="bold" style={styles.gpsAction}>
                    {t('report.camera.openSettings')}
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>

          <Controller
            control={control}
            name="district"
            render={({ field }) => (
              <DistrictPicker value={field.value} onChange={field.onChange} error={errors.district?.message} />
            )}
          />

          <Controller
            control={control}
            name="tehsil"
            render={({ field }) => (
              <TextField
                label={t('report.location.tehsil')}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.tehsil?.message}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.ucNumber}>
              <Controller
                control={control}
                name="ucNumber"
                render={({ field }) => (
                  <TextField
                    label={t('report.location.ucNumber')}
                    ltr
                    keyboardType="number-pad"
                    maxLength={5}
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.ucNumber?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flex}>
              <Controller
                control={control}
                name="ucName"
                render={({ field }) => (
                  <TextField label={t('report.location.ucName')} value={field.value} onChangeText={field.onChange} />
                )}
              />
            </View>
          </View>
          <AppText style={styles.hint}>{t('report.location.ucHint')}</AppText>

          <Controller
            control={control}
            name="settlementType"
            render={({ field }) => (
              <View style={styles.typeWrap}>
                <AppText weight="bold" style={styles.label}>
                  {t('report.location.settlementType')}
                </AppText>
                <View style={styles.typeRow}>
                  {SETTLEMENT_TYPES.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => field.onChange(type)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: field.value === type }}
                      style={[styles.typeOption, field.value === type && styles.typeOptionActive]}
                    >
                      <AppText style={field.value === type ? styles.typeTextActive : undefined}>
                        {t(`report.location.${type}`)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="settlementName"
            render={({ field }) => (
              <TextField
                label={t('report.location.settlementName')}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.settlementName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <TextField
                label={t('report.location.address')}
                placeholder={t('report.location.addressPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                maxLength={200}
              />
            )}
          />

          <Button title={t('report.location.next')} onPress={onNext} disabled={gps === 'locating'} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 18 },
  header: { gap: 4 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, color: colors.muted },

  gpsBox: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  gpsGood: { backgroundColor: colors.brand50, borderColor: colors.brand100 },
  gpsWarn: { backgroundColor: colors.warningBg, borderColor: '#fde68a' },
  gpsBody: { flex: 1, gap: 4 },
  gpsText: { fontSize: 14 },
  gpsAction: { fontSize: 14, color: colors.brand700 },

  row: { flexDirection: 'row', gap: 10 },
  ucNumber: { width: 130 },
  hint: { fontSize: 13, color: colors.muted, marginTop: -8 },

  label: { fontSize: 15 },
  typeWrap: { gap: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  typeOptionActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  typeTextActive: { color: colors.brand700 },
});