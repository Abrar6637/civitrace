import { I18nManager, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

// The arrow points the right way in both Urdu (RTL) and English
export function BackButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={12}
      style={{ alignSelf: 'flex-start', padding: 4 }}
    >
      <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={26} color={colors.text} />
    </Pressable>
  );
}