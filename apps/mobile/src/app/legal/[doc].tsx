import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/AppText';
import { BackButton } from '../../components/BackButton';
import { colors } from '../../theme';

type Section = { h: string; p: string };

// Terms of use and privacy policy. Open before and after sign-in.
export default function LegalScreen() {
  const { t } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const key = doc === 'privacy' ? 'privacy' : 'terms';
  const sections = t(`legal.${key}.sections`, { returnObjects: true }) as Section[];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <AppText weight="bold" style={styles.title}>
          {t(`legal.${key}.title`)}
        </AppText>
        <AppText style={styles.muted}>{t('legal.updated', { date: '2026-11-09' })}</AppText>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <AppText weight="bold" style={styles.heading}>
              {`${i + 1}. ${s.h}`}
            </AppText>
            <AppText style={styles.text}>{s.p}</AppText>
          </View>
        ))}
        <AppText style={styles.muted}>{t('legal.contact')}</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24 },
  section: { gap: 4 },
  heading: { fontSize: 16 },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
});