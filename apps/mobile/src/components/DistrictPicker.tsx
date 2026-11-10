import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PUNJAB_DISTRICTS } from '@civitrace/shared';
import { AppText } from './AppText';
import { colors, fonts } from '../theme';

type Props = {
  value?: string;
  onChange: (district: string) => void;
  error?: string;
};

export function DistrictPicker({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const list = PUNJAB_DISTRICTS.filter((d) => d.toLowerCase().includes(term));

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.label}>
        {t('report.location.district')}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('report.location.district')}
        style={[styles.field, !!error && styles.fieldError]}
      >
        <AppText style={value ? styles.value : styles.placeholder}>{value || t('report.location.chooseDistrict')}</AppText>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error && <AppText style={styles.error}>{error}</AppText>}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('report.location.searchDistrict')}
              placeholderTextColor={colors.muted}
              autoFocus
              style={styles.search}
            />
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel={t('report.camera.close')}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={list}
            keyExtractor={(d) => d}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery('');
                }}
                style={styles.row}
              >
                <AppText style={styles.rowText}>{item}</AppText>
                {item === value && <Ionicons name="checkmark" size={20} color={colors.brand600} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 15 },
  field: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldError: { borderColor: colors.danger },
  value: { fontSize: 17 },
  placeholder: { fontSize: 16, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
  modal: { flex: 1, backgroundColor: colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: { flex: 1, fontSize: 17, fontFamily: fonts.latin, color: colors.text, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  rowText: { fontSize: 17 },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },
});