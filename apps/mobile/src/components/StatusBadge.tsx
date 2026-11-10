import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComplaintStatus } from '@civitrace/shared';
import { AppText } from './AppText';
import { colors } from '../theme';

type Tone = { bg: string; text: string };

const GRAY: Tone = { bg: '#f1f5f9', text: '#475569' };
const BLUE: Tone = { bg: '#eff6ff', text: '#1d4ed8' };
const GREEN: Tone = { bg: colors.brand50, text: colors.brand700 };
const AMBER: Tone = { bg: colors.warningBg, text: colors.warningText };
const RED: Tone = { bg: '#fef2f2', text: colors.danger };

const TONES: Record<ComplaintStatus, Tone> = {
  submitted: GRAY,
  under_review: GRAY,
  published: BLUE,
  routed: BLUE,
  acknowledged: BLUE,
  action_planned: BLUE,
  in_progress: BLUE,
  awaiting_confirmation: AMBER,
  reopened: AMBER,
  resolved: GREEN,
  closed: GREEN,
  rejected: RED,
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const { t } = useTranslation();
  const tone = TONES[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <AppText style={[styles.text, { color: tone.text }]}>{t(`statuses.${status}`)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  text: { fontSize: 12 },
});