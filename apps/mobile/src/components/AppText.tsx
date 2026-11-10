import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '../theme';

type Props = TextProps & { weight?: 'regular' | 'bold' };

// Picks the right font for the language. Nastaliq needs extra line height.
export function AppText({ weight = 'regular', style, ...props }: Props) {
  const { i18n } = useTranslation();
  const urdu = i18n.language === 'ur';
  const size = StyleSheet.flatten(style)?.fontSize ?? 16;

  const fontFamily = urdu
    ? weight === 'bold' ? fonts.urduBold : fonts.urdu
    : weight === 'bold' ? fonts.latinBold : fonts.latin;

  return (
    <Text
      {...props}
      style={[{ color: colors.text, fontSize: 16, fontFamily, lineHeight: size * (urdu ? 2 : 1.4) }, style]}
    />
  );
}