import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors } from '../theme';

// Shown while data is loading
export function LoadingView() {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.brand600} />
      <AppText style={styles.muted}>{t('common.loading')}</AppText>
    </View>
  );
}

// Shown when loading failed, with a way to try again
export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.border} />
      <AppText style={styles.muted}>{message}</AppText>
      {onRetry && <Button title={t('common.retry')} variant="secondary" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 20 },
  muted: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});