import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colors, fonts } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  ltr?: boolean; // numbers, codes and emails are always left-to-right
};

export function TextField({ label, error, hint, ltr = false, style, ...props }: Props) {
  const { i18n } = useTranslation();
  const urduFont = i18n.language === 'ur' && !ltr;

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        style={[
          styles.input,
          { fontFamily: urduFont ? fonts.urdu : fonts.latin },
          ltr && styles.ltr,
          !!error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {hint && !error && <AppText style={styles.hint}>{hint}</AppText>}
      {error && <AppText style={styles.error}>{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 15 },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 17,
    color: colors.text,
  },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  inputError: { borderColor: colors.danger },
  hint: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});