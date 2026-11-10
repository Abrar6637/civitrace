import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colors } from '../theme';

// A thin notice at the top of every screen while there is no internet
export function OfflineBanner() {
  const { t } = useTranslation();
  const net = useNetInfo();
  const insets = useSafeAreaInsets();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warningText} />
      <AppText style={styles.text}>{t('common.offline')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6, backgroundColor: colors.warningBg },
  text: { flex: 1, fontSize: 12, color: colors.warningText },
});