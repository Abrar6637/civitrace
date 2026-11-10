import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useTranslation } from 'react-i18next';
import i18n, { initI18n } from '../i18n';
import { useSession } from '../store/session';
import { AppText } from '../components/AppText';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // the splash screen may already be hidden; nothing to do
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// If something never finishes, open the app anyway after this time
const STARTUP_TIMEOUT_MS = 8000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoNastaliqUrdu_400Regular,
    NotoNastaliqUrdu_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);

  const status = useSession((s) => s.status);
  const profileComplete = useSession((s) => s.profileComplete);
  const bootstrap = useSession((s) => s.bootstrap);

  useEffect(() => {
    initI18n()
      .then((result) => setNeedsRestart(result.needsRestart))
      .catch(() => {
        // fall back to the default language
      })
      .finally(() => setI18nReady(true));

    bootstrap().catch(() => useSession.setState({ status: 'signedOut' }));

    // Safety net: never stay on the splash screen forever
    const timer = setTimeout(() => {
      setI18nReady(true);
      if (useSession.getState().status === 'loading') {
        useSession.setState({ status: 'signedOut' });
      }
    }, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [bootstrap]);

  // A font error should not block the app; it then uses the system font
  const ready = (fontsLoaded || !!fontError) && i18nReady && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        {needsRestart && <RestartNotice />}
        <OfflineBanner />
        {/* Which screens are reachable depends on the session */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="verify" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !profileComplete}>
            <Stack.Screen name="profile-setup" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && profileComplete}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      </View>
    </QueryClientProvider>
  );
}

function RestartNotice() {
  const { t } = useTranslation();
  return (
    <View style={styles.notice}>
      <AppText style={styles.noticeText}>{t('restartNotice')}</AppText>
    </View>
  );
}

// Shown instead of a crashed screen. The saved draft and queued complaints are not lost.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.crash}>
      <AppText weight="bold" style={styles.crashTitle}>
        {i18n.t('common.errorTitle', { defaultValue: 'Something went wrong' })}
      </AppText>
      <AppText style={styles.crashText}>
        {i18n.t('common.errorText', { defaultValue: 'Please try again. Your unfinished complaint is saved.' })}
      </AppText>
      <Pressable onPress={retry} accessibilityRole="button" style={styles.crashButton}>
        <AppText weight="bold" style={styles.crashButtonText}>
          {i18n.t('common.retry', { defaultValue: 'Try again' })}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  notice: { backgroundColor: colors.warningBg, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 },
  noticeText: { color: colors.warningText, fontSize: 13 },
  crash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
  crashTitle: { fontSize: 22, textAlign: 'center' },
  crashText: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  crashButton: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.brand600 },
  crashButtonText: { color: colors.white, fontSize: 16 },
});