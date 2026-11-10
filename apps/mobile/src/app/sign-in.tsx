import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { otpRequestInputSchema, type OtpRequestInput } from '@civitrace/shared';
import { authService } from '../services/auth.service';
import { errorKey } from '../services/config';
import { AppText } from '../components/AppText';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors } from '../theme';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpRequestInput>({ resolver: zodResolver(otpRequestInputSchema), defaultValues: { phone: '' } });

  const mutation = useMutation({
    mutationFn: (phone: string) => authService.requestOtp(phone),
    onSuccess: (res) =>
      router.push({ pathname: '/verify', params: { phone: res.phone, devCode: res.devCode ?? '' } }),
  });

  const onSubmit = handleSubmit((values) => {
    if (!agreed) {
      setAgreeError(true);
      return;
    }
    mutation.mutate(values.phone);
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />

          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {t('signIn.title')}
            </AppText>
            <AppText style={styles.subtitle}>{t('signIn.subtitle')}</AppText>
          </View>

          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextField
                label={t('signIn.phoneLabel')}
                ltr
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="03001234567"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={16}
                returnKeyType="done"
                onSubmitEditing={() => onSubmit()}
                error={errors.phone ? t('signIn.phoneInvalid') : undefined}
              />
            )}
          />

          <View style={styles.agreeBox}>
            <Pressable
              onPress={() => {
                setAgreed((v) => !v);
                setAgreeError(false);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              style={styles.agreeRow}
            >
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={24}
                color={agreeError ? colors.danger : colors.brand600}
              />
              <AppText style={styles.agreeText}>{t('signIn.agree')}</AppText>
            </Pressable>

            <View style={styles.legalLinks}>
              <Pressable
                onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
                accessibilityRole="link"
                hitSlop={8}
              >
                <AppText style={styles.legalLink}>{t('legal.terms.title')}</AppText>
              </Pressable>
              <AppText style={styles.legalDot}>·</AppText>
              <Pressable
                onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
                accessibilityRole="link"
                hitSlop={8}
              >
                <AppText style={styles.legalLink}>{t('legal.privacy.title')}</AppText>
              </Pressable>
            </View>

            {agreeError && <AppText style={styles.error}>{t('signIn.agreeRequired')}</AppText>}
          </View>

          {mutation.error && <AppText style={styles.error}>{t(errorKey(mutation.error))}</AppText>}

          <Button title={t('signIn.send')} onPress={onSubmit} loading={mutation.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 15, color: colors.muted },
  agreeBox: { gap: 8 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  agreeText: { flex: 1, fontSize: 14 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 34 },
  legalLink: { fontSize: 13, color: colors.brand700, textDecorationLine: 'underline' },
  legalDot: { fontSize: 13, color: colors.muted },
  error: { fontSize: 14, color: colors.danger },
});