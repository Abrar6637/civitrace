import { Switch, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../theme';

type Props = { title: string; text?: string; value: boolean; onChange: (value: boolean) => void };

export function SwitchRow({ title, text, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <AppText weight="bold" style={styles.title}>
          {title}
        </AppText>
        {text && <AppText style={styles.text}>{text}</AppText>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: colors.brand500, false: colors.border }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1 },
  title: { fontSize: 15 },
  text: { fontSize: 13, color: colors.muted },
});