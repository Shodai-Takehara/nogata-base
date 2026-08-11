import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';

type Props = {
  label: string;
  color: string;
};

export function StatusChip({ label, color }: Props) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
