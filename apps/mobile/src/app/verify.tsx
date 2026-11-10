import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
import { OTP_LENGTH, OTP_RESEND_SECONDS, formatPakistaniMobile } from '@civitrace/shared';
import { authService } from '../services/auth.service';
import { errorKey } from '../services/config';
import { useSession } from '../store/session';
import { AppText } from '../components/AppText';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { colors, fonts } from '../theme';

// Keeps a phone number left-to-right inside Urdu text
const ltr = (text: string) => `\u2066${text}\u2069`;

export default function VerifyScreen() {
  const { t } = useTranslation();
  const { phone, devCode } = useLocalSearchParams<{ phone: string; devCode?: string }>();
  const signIn = useSession((s) => s.signIn);

  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(OTP_RESEND_SECONDS);

  // Countdown for "resend"
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = useMutation({
    mutationFn: (value: string) => authService.verifyOtp(phone, value),
    onSuccess: (session) => signIn(session), // the layout then opens the right screen
    onError: () => setCode(''),
  });

  const resend = useMutation({
    mutationFn: () => authService.requestOtp(phone),
    onSuccess: () => {
      setSeconds(OTP_RESEND_SECONDS);
      verify.reset();
    },
  });

  function onChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH) verify.mutate(digits); // check as soon as it is complete
  }

  const error = verify.error ?? resend.error;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton />

          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {t('verify.title')}
            </AppText>
            <AppText style={styles.subtitle}>
              {t('verify.sentTo', { phone: ltr(formatPakistaniMobile(phone)) })}
            </AppText>
          </View>

          <TextInput
            value={code}
            onChangeText={onChange}
            accessibilityLabel={t('verify.codeLabel')}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            maxLength={OTP_LENGTH}
            editable={!verify.isPending}
            style={[styles.codeInput, !!verify.error && styles.codeInputError]}
            placeholder={'•'.repeat(OTP_LENGTH)}
            placeholderTextColor={colors.border}
          />

          {__DEV__ && devCode ? <AppText style={styles.dev}>Dev: code is {devCode}</AppText> : null}

          {error && <AppText style={styles.error}>{t(errorKey(error))}</AppText>}

          <Button
            title={t('verify.submit')}
            onPress={() => verify.mutate(code)}
            loading={verify.isPending}
            disabled={code.length !== OTP_LENGTH}
          />

          {seconds > 0 ? (
            <AppText style={styles.muted}>{t('verify.resendIn', { seconds })}</AppText>
          ) : (
            <Button title={t('verify.resend')} variant="ghost" onPress={() => resend.mutate()} loading={resend.isPending} />
          )}

          <Button title={t('verify.changeNumber')} variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 18 },
  header: { gap: 4 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 15, color: colors.muted },
  codeInput: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    fontSize: 30,
    letterSpacing: 14,
    textAlign: 'center',
    writingDirection: 'ltr',
    fontFamily: fonts.latinBold,
    color: colors.text,
  },
  codeInputError: { borderColor: colors.danger },
  dev: { fontSize: 13, color: colors.brand700, textAlign: 'center' },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  muted: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});