import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { DEMO_SCENARIO_COPY, useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';

/**
 * デモモード中に全画面へ常時表示するバナー。
 * 模擬データが本物の防災情報と混ざって見えることを防ぐ、安全のための表示。
 * どの災害を再現中かも書き、大雨のつもりで地震の画面を見せる取り違えを防ぐ
 */
export function DemoBanner() {
  const { settings } = useSettings();
  const copy = useCopy();
  if (!settings.demoMode) return null;
  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <AppText style={styles.text}>
        {copy[DEMO_SCENARIO_COPY[settings.demoScenario].banner]}
      </AppText>
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
    // 折り返したとき、行の幅が丸印のぶん右へはみ出さないようにする
    flexShrink: 1,
  },
});
