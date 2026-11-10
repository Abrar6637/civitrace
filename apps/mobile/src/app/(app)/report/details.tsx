import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COMPLAINT_CATEGORIES, DESCRIPTION_MIN_CHARS, type ComplaintCategory } from '@civitrace/shared';
import { useReportDraft } from '../../../store/report-draft';
import { formatDistance, nearbyService, type PublicComplaint } from '../../../services/nearby.service';
import { AppText } from '../../../components/AppText';
import { BackButton } from '../../../components/BackButton';
import { Button } from '../../../components/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { SwitchRow } from '../../../components/SwitchRow';
import { TextField } from '../../../components/TextField';
import { VoiceNoteRecorder } from '../../../components/VoiceNoteRecorder';
import { colors } from '../../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<ComplaintCategory, IconName> = {
  road_missing: 'map-outline',
  pothole: 'alert-circle-outline',
  broken_road: 'construct-outline',
  streetlight: 'bulb-outline',
  drainage: 'rainy-outline',
  water_supply: 'water-outline',
  bridge: 'swap-horizontal-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

export default function DetailsScreen() {
  const { t } = useTranslation();
  const draft = useReportDraft();
  const setDetails = useReportDraft((s) => s.setDetails);
  const resetDraft = useReportDraft((s) => s.reset);
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});
  const [checking, setChecking] = useState(false);
  const [similar, setSimilar] = useState<PublicComplaint[]>([]);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [supportingId, setSupportingId] = useState<string | null>(null);

  async function onNext() {
    const next: typeof errors = {};
    if (!draft.category) next.category = t('report.details.categoryRequired');
    if (draft.description.trim().length < DESCRIPTION_MIN_CHARS && !draft.voiceNote) {
      next.description = t('report.details.descriptionRequired', { min: DESCRIPTION_MIN_CHARS });
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Ask once per category: is this problem already reported close by?
    const key = draft.category ?? '';
    if (draft.point && draft.category && checkedKey !== key) {
      setChecking(true);
      try {
        const found = await nearbyService.similar(draft.point, draft.category);
        setCheckedKey(key);
        if (found.length > 0) {
          setSimilar(found);
          return;
        }
      } catch {
        // if the check fails, the citizen can still continue
      } finally {
        setChecking(false);
      }
    }
    router.push('/report/review');
  }

  async function supportExisting(c: PublicComplaint) {
    setSupportingId(c.id);
    try {
      if (!c.isMine) await nearbyService.support(c.id);
      setSimilar([]);
      resetDraft();
      router.dismissTo('/home');
      router.push(
        c.isMine ? { pathname: '/complaints/[id]', params: { id: c.id } } : { pathname: '/public/[id]', params: { id: c.id } }
      );
    } finally {
      setSupportingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <AppText weight="bold" style={styles.title}>
            {t('report.details.title')}
          </AppText>

          {/* Category */}
          <View style={styles.section}>
            <AppText weight="bold" style={styles.label}>
              {t('report.details.category')}
            </AppText>
            <View style={styles.grid}>
              {COMPLAINT_CATEGORIES.map((c) => {
                const selected = draft.category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setDetails({ category: c });
                      setErrors((e) => ({ ...e, category: undefined }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.categoryOption, selected && styles.categoryOptionActive]}
                  >
                    <Ionicons name={CATEGORY_ICONS[c]} size={24} color={selected ? colors.brand700 : colors.muted} />
                    <AppText style={[styles.categoryText, selected && styles.categoryTextActive]}>
                      {t(`categories.${c}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {errors.category && <AppText style={styles.error}>{errors.category}</AppText>}
          </View>

          {/* Description or voice */}
          <TextField
            label={t('report.details.description')}
            placeholder={t('report.details.descriptionPlaceholder')}
            value={draft.description}
            onChangeText={(v) => {
              setDetails({ description: v });
              if (errors.description) setErrors((e) => ({ ...e, description: undefined }));
            }}
            multiline
            maxLength={1000}
            style={styles.description}
            error={errors.description}
          />

          <VoiceNoteRecorder
            value={draft.voiceNote}
            onChange={(note) => {
              setDetails({ voiceNote: note });
              if (note) setErrors((e) => ({ ...e, description: undefined }));
            }}
          />

          {/* Hazard */}
          <View style={[styles.card, draft.isHazard && styles.hazardCard]}>
            <SwitchRow
              title={t('report.details.hazardTitle')}
              text={t('report.details.hazardText')}
              value={draft.isHazard}
              onChange={(v) => setDetails({ isHazard: v })}
            />
            {draft.isHazard && (
              <View style={styles.emergency}>
                <Ionicons name="call" size={16} color={colors.danger} />
                <AppText style={styles.emergencyText}>{t('report.details.hazardEmergency')}</AppText>
              </View>
            )}
          </View>

          {/* Representatives */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.label}>
              {t('report.details.notifyTitle')}
            </AppText>
            <SwitchRow
              title={t('report.details.notifyMna')}
              value={draft.notifyMna}
              onChange={(v) => setDetails({ notifyMna: v })}
            />
            <SwitchRow
              title={t('report.details.notifyMpa')}
              value={draft.notifyMpa}
              onChange={(v) => setDetails({ notifyMpa: v })}
            />
            <AppText style={styles.muted}>{t('report.details.notifyText')}</AppText>
          </View>

          <Button title={t('report.details.next')} onPress={() => void onNext()} loading={checking} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Possible duplicate */}
      <Modal visible={similar.length > 0} transparent animationType="slide" onRequestClose={() => setSimilar([])}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Ionicons name="copy-outline" size={22} color={colors.warningText} />
              <AppText weight="bold" style={styles.sheetTitle}>
                {t('duplicate.title')}
              </AppText>
            </View>
            <AppText style={styles.muted}>{t('duplicate.text')}</AppText>

            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
              {similar.map((c) => (
                <View key={c.id} style={styles.dupe}>
                  <View style={styles.dupeTop}>
                    <AppText weight="bold" style={styles.dupeTitle}>
                      {t(`categories.${c.category}`)}
                    </AppText>
                    <AppText style={styles.dupeDistance}>{formatDistance(c.distanceM, t)}</AppText>
                  </View>
                  <View style={styles.dupeTop}>
                    <StatusBadge status={c.status} />
                    <AppText style={styles.muted}>
                      {c.isMine ? t('nearby.mine') : t('nearby.supporters', { count: c.supporters })}
                    </AppText>
                  </View>
                  <Button
                    title={t('duplicate.supportThis')}
                    loading={supportingId === c.id}
                    onPress={() => void supportExisting(c)}
                  />
                </View>
              ))}
            </ScrollView>

            <Button
              title={t('duplicate.different')}
              variant="secondary"
              onPress={() => {
                setSimilar([]);
                router.push('/report/review');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 18 },
  title: { fontSize: 24 },
  section: { gap: 8 },
  label: { fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: {
    width: '47%',
    flexGrow: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  categoryOptionActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  categoryText: { flex: 1, fontSize: 14 },
  categoryTextActive: { color: colors.brand700 },
  description: { minHeight: 110, textAlignVertical: 'top' },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  hazardCard: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  emergency: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  emergencyText: { flex: 1, fontSize: 13, color: colors.danger },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '85%', gap: 12, padding: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.background },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { flex: 1, fontSize: 18 },
  sheetList: { flexGrow: 0 },
  sheetListContent: { gap: 10 },
  dupe: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  dupeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dupeTitle: { fontSize: 15 },
  dupeDistance: { fontSize: 12, color: colors.brand700 },
});