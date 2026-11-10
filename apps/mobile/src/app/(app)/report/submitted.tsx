import { useEffect } from 'react';
import { BackHandler, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { colors } from '../../../theme';

export default function SubmittedScreen() {
  const { t } = useTranslation();
  const { complaintNo, queued } = useLocalSearchParams<{ complaintNo?: string; queued?: string }>();
  const isQueued = queued === '1';

  const goHome = () => router.dismissTo('/home');

  // The back button goes home, not back into the finished form
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={[styles.icon, isQueued && styles.iconQueued]}>
          <Ionicons
            name={isQueued ? 'cloud-offline-outline' : 'checkmark'}
            size={44}
            color={isQueued ? colors.warningText : colors.white}
          />
        </View>

        <AppText weight="bold" style={styles.title}>
          {isQueued ? t('report.submitted.queuedTitle') : t('report.submitted.title')}
        </AppText>

        {isQueued ? (
          <AppText style={styles.text}>{t('report.submitted.queuedText')}</AppText>
        ) : (
          <>
            <AppText style={styles.muted}>{t('report.submitted.number')}</AppText>
            <AppText weight="bold" style={styles.number}>
              {complaintNo}
            </AppText>
            <AppText style={styles.text}>{t('report.submitted.next')}</AppText>
          </>
        )}
      </View>

      <View style={styles.actions}>
        {!isQueued && complaintNo && (
          <Button
            title={t('report.submitted.share')}
            variant="secondary"
            onPress={() => Share.share({ message: t('report.submitted.shareMessage', { number: complaintNo }) })}
          />
        )}
        <Button title={t('report.submitted.home')} onPress={goHome} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  icon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brand600, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconQueued: { backgroundColor: colors.warningBg },
  title: { fontSize: 24, textAlign: 'center' },
  number: { fontSize: 22, color: colors.brand700, writingDirection: 'ltr', fontFamily: 'Inter_600SemiBold' },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  actions: { gap: 10 },
});