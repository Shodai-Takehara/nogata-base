import { StatusBanner } from '@/components/status-banner';
import { AppColors } from '@/constants/tokens';
import { DEMO_SCENARIO_COPY, useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';

/**
 * デモモード中に全画面へ常時表示する帯。
 * 模擬データが本物の防災情報と混ざって見えることを防ぐ、安全のための表示。
 * どの災害を再現中かも書き、大雨のつもりで地震の画面を見せる取り違えを防ぐ
 */
export function DemoBanner() {
  const { settings } = useSettings();
  const copy = useCopy();
  if (!settings.demoMode) return null;
  return (
    <StatusBanner
      color={AppColors.demo}
      dotColor={AppColors.demoAccent}
      text={copy[DEMO_SCENARIO_COPY[settings.demoScenario].banner]}
    />
  );
}
