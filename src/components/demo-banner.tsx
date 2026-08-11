import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';

/**
 * デモモード中に全画面へ常時表示するバナー(要件 F-09)。
 * 模擬データが本物の防災情報と混ざって見えることを防ぐ、安全のための表示。
 */
export function DemoBanner() {
  const { settings } = useSettings();
  const copy = useCopy();
  if (!settings.demoMode) return null;
  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <AppText style={styles.text}>{copy.demoBanner}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AppColors.demo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.demoAccent,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
