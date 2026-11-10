import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COMPLAINT_CATEGORIES } from '@civitrace/shared';
import { router } from 'expo-router';
import { AppText } from '../components/AppText';
import { changeLanguage, type Language } from '../i18n';
import { colors } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const current: Language = i18n.language === 'en' ? 'en' : 'ur';

  const features: { icon: IconName; title: string; text: string }[] = [
    { icon: 'camera-outline', title: t('welcome.f1Title'), text: t('welcome.f1Text') },
    { icon: 'location-outline', title: t('welcome.f2Title'), text: t('welcome.f2Text') },
    { icon: 'checkmark-done-outline', title: t('welcome.f3Title'), text: t('welcome.f3Text') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Language switch */}
        <View style={styles.langRow}>
          {(['ur', 'en'] as const).map((lng) => (
            <Pressable
              key={lng}
              onPress={() => changeLanguage(lng)}
              accessibilityRole="button"
              accessibilityState={{ selected: current === lng }}
              style={[styles.langButton, current === lng && styles.langButtonActive]}
            >
              <AppText style={[styles.langText, current === lng && styles.langTextActive]}>
                {t(`language.${lng}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <AppText weight="bold" style={styles.logoLetter}>
              C
            </AppText>
          </View>
          <AppText weight="bold" style={styles.title}>
            {t('appName')}
          </AppText>
          <AppText style={styles.tagline}>{t('welcome.tagline')}</AppText>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={colors.brand700} />
              </View>
              <View style={styles.featureBody}>
                <AppText weight="bold" style={styles.featureTitle}>
                  {f.title}
                </AppText>
                <AppText style={styles.featureText}>{f.text}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Start (sign-in comes in the next step) */}
                <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sign-in')}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <AppText weight="bold" style={styles.buttonText}>
            {t('welcome.start')}
          </AppText>
        </Pressable>

        <View style={styles.emergency}>
          <Ionicons name="call-outline" size={16} color={colors.danger} />
          <AppText style={styles.emergencyText}>{t('welcome.emergency')}</AppText>
        </View>

        {/* {__DEV__ && (
          <AppText style={styles.dev}>Shared package OK: {COMPLAINT_CATEGORIES.length} categories</AppText>
        )} */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 24, flexGrow: 1 },

  langRow: { flexDirection: 'row', alignSelf: 'flex-end', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 3 },
  langButton: { paddingHorizontal: 12, paddingVertical: 2, borderRadius: 8 },
  langButtonActive: { backgroundColor: colors.text },
  langText: { fontSize: 13, color: colors.muted },
  langTextActive: { color: colors.white },

  brand: { alignItems: 'center', gap: 6, marginTop: 8 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.brand600, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: colors.white, fontSize: 30, lineHeight: 38 },
  title: { fontSize: 28, color: colors.brand900, lineHeight: 36 },
  tagline: { fontSize: 18, color: colors.muted, textAlign: 'center' },

  features: { gap: 14 },
  feature: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  featureIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  featureBody: { flex: 1 },
  featureTitle: { fontSize: 16 },
  featureText: { fontSize: 14, color: colors.muted },

  button: { backgroundColor: colors.brand600, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 'auto' },
  buttonPressed: { backgroundColor: colors.brand700 },
  buttonText: { color: colors.white, fontSize: 18 },

  emergency: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  emergencyText: { flex: 1, fontSize: 13, color: colors.danger },

  dev: { fontSize: 11, color: colors.muted, textAlign: 'center' },
});