import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../theme';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary' }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && variant === 'primary' && styles.primaryPressed,
        pressed && variant !== 'primary' && styles.lightPressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.brand600} />
      ) : (
        <AppText weight="bold" style={[styles.text, variant !== 'primary' && styles.textDark]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.brand600 },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  primaryPressed: { backgroundColor: colors.brand700 },
  lightPressed: { backgroundColor: colors.brand50 },
  inactive: { opacity: 0.5 },
  text: { color: colors.white, fontSize: 17 },
  textDark: { color: colors.brand700 },
});