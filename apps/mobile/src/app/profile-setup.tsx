import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { citizenProfileInputSchema, type CitizenProfileInput } from '@civitrace/shared';
import { authService } from '../services/auth.service';
import { errorKey } from '../services/config';
import { useSession } from '../store/session';
import { changeLanguage, type Language } from '../i18n';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors } from '../theme';
import { router } from 'expo-router';

const toText = (v: string) => (v.trim() ? v : undefined);

export default function ProfileSetupScreen() {
  const { t, i18n } = useTranslation();
  const token = useSession((s) => s.token);
  const updateUser = useSession((s) => s.updateUser);
  const currentLanguage: Language = i18n.language === 'en' ? 'en' : 'ur';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CitizenProfileInput>({
    resolver: zodResolver(citizenProfileInputSchema),
    defaultValues: { name: '', locale: currentLanguage },
  });

  const mutation = useMutation({
    mutationFn: (input: CitizenProfileInput) => authService.completeProfile(token!, input),
        onSuccess: async (user, input) => {
      if (input.locale !== currentLanguage) await changeLanguage(input.locale);
      updateUser(user, true);
      router.replace('/home');
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {t('profile.title')}
            </AppText>
            <AppText style={styles.subtitle}>{t('profile.subtitle')}</AppText>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextField
                label={t('profile.nameLabel')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoComplete="name"
                textContentType="name"
                error={errors.name ? t('profile.nameInvalid') : undefined}
              />
            )}
          />

          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <TextField
                label={t('profile.displayNameLabel')}
                value={field.value ?? ''}
                onChangeText={(v) => field.onChange(toText(v))}
                hint={t('profile.displayNameHint')}
                maxLength={40}
              />
            )}
          />

          <Controller
            control={control}
            name="locale"
            render={({ field }) => (
              <View style={styles.langWrap}>
                <AppText weight="bold" style={styles.label}>
                  {t('profile.languageLabel')}
                </AppText>
                <View style={styles.langRow}>
                  {(['ur', 'en'] as const).map((lng) => (
                    <Pressable
                      key={lng}
                      onPress={() => field.onChange(lng)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: field.value === lng }}
                      style={[styles.langOption, field.value === lng && styles.langOptionActive]}
                    >
                      <AppText style={field.value === lng ? styles.langTextActive : undefined}>
                        {t(`language.${lng}`)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          />

          {mutation.error && <AppText style={styles.error}>{t(errorKey(mutation.error))}</AppText>}

          <Button title={t('profile.save')} onPress={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 20 },
  header: { gap: 4, marginTop: 12 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 15, color: colors.muted },
  label: { fontSize: 15 },
  langWrap: { gap: 8 },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOptionActive: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  langTextActive: { color: colors.brand700 },
  error: { fontSize: 14, color: colors.danger },
});