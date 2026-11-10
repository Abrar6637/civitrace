import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { citizenProfileInputSchema, formatPakistaniMobile } from '@civitrace/shared';
import { changeLanguage, type Language } from '../../i18n';
import { authService } from '../../services/auth.service';
import { errorKey } from '../../services/config';
import { useSession } from '../../store/session';
import { useNotifications } from '../../store/notifications';
import { ensureNotificationPermission } from '../../lib/notify';
import { AppText } from '../../components/AppText';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { SwitchRow } from '../../components/SwitchRow';
import { TextField } from '../../components/TextField';
import { colors } from '../../theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  const updateUser = useSession((s) => s.updateUser);
  const signOut = useSession((s) => s.signOut);
  const language: Language = i18n.language === 'en' ? 'en' : 'ur';

  const [name, setName] = useState(user?.name ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const notificationsOn = useNotifications((s) => s.enabled);
  const setNotificationsOn = useNotifications((s) => s.setEnabled);
  const [permissionError, setPermissionError] = useState(false);

  async function toggleNotifications(value: boolean) {
    setPermissionError(false);
    if (value && !(await ensureNotificationPermission())) {
      setPermissionError(true);
      return;
    }
    setNotificationsOn(value);
  }

  const save = useMutation({
    mutationFn: () =>
      authService.completeProfile(token!, {
        name: name.trim(),
        displayName: displayName.trim() || undefined,
        locale: language,
      }),
    onSuccess: (updated) => {
      updateUser(updated, true);
      setSaved(true);
    },
  });

  function onSave() {
    setSaved(false);
    const check = citizenProfileInputSchema.safeParse({
      name: name.trim(),
      displayName: displayName.trim() || undefined,
      locale: language,
    });
    if (!check.success) {
      setNameError(t('profile.nameInvalid'));
      return;
    }
    setNameError(undefined);
    save.mutate();
  }

  function confirmSignOut() {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutText'), [
      { text: t('settings.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />
          <AppText weight="bold" style={styles.title}>
            {t('settings.title')}
          </AppText>

          {/* Profile */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('settings.profile')}
            </AppText>
            <TextField
              label={t('profile.nameLabel')}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setSaved(false);
              }}
              error={nameError}
            />
            <TextField
              label={t('profile.displayNameLabel')}
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                setSaved(false);
              }}
              hint={t('profile.displayNameHint')}
            />
            {save.error && <AppText style={styles.error}>{t(errorKey(save.error))}</AppText>}
            {saved && <AppText style={styles.ok}>{t('settings.saved')}</AppText>}
            <Button title={t('settings.save')} onPress={onSave} loading={save.isPending} />
          </View>

          {/* Language */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('profile.languageLabel')}
            </AppText>
            <View style={styles.langRow}>
              {(['ur', 'en'] as const).map((lng) => {
                const selected = language === lng;
                return (
                  <Pressable
                    key={lng}
                    onPress={() => !selected && void changeLanguage(lng)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.lang, selected && styles.langActive]}
                  >
                    <AppText style={[styles.langText, selected && styles.langTextActive]}>{t(`language.${lng}`)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.card}>
            <SwitchRow
              title={t('notifications.settingTitle')}
              text={t('notifications.settingText')}
              value={notificationsOn}
              onChange={(v) => void toggleNotifications(v)}
            />
            {permissionError && <AppText style={styles.error}>{t('notifications.permissionDenied')}</AppText>}
          </View>

          {/* Phone */}
          <View style={styles.card}>
            <AppText weight="bold" style={styles.cardTitle}>
              {t('settings.phone')}
            </AppText>
            {user?.phone && <AppText style={styles.phone}>{`\u2066${formatPakistaniMobile(user.phone)}\u2069`}</AppText>}
            <AppText style={styles.muted}>{t('settings.phoneNote')}</AppText>
          </View>

          {/* Privacy */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand700} />
              <AppText weight="bold" style={styles.cardTitle}>
                {t('settings.privacy')}
              </AppText>
            </View>
            <AppText style={styles.muted}>{t('settings.privacyText')}</AppText>
            <Button
              title={t('legal.privacy.title')}
              variant="ghost"
              onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
            />
            <Button
              title={t('legal.terms.title')}
              variant="ghost"
              onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
            />
          </View>

          <View style={styles.emergency}>
            <Ionicons name="call-outline" size={18} color={colors.danger} />
            <AppText style={styles.emergencyText}>{t('welcome.emergency')}</AppText>
          </View>

          <Button title={t('settings.signOut')} variant="secondary" onPress={confirmSignOut} />

          <AppText style={styles.version}>
            {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24 },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langRow: { flexDirection: 'row', gap: 10 },
  lang: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  langActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  langText: { fontSize: 15 },
  langTextActive: { color: colors.brand700 },
  phone: { fontSize: 16 },
  emergency: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#fef2f2' },
  emergencyText: { flex: 1, fontSize: 13, color: colors.danger },
  version: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  ok: { fontSize: 13, color: colors.brand700 },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});