import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { StatusBanner } from '@/components/status-banner';
import { AppColors } from '@/constants/tokens';
import { useOffline } from '@/state/network';
import { spokenCopy, useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';

/**
 * OS が経路なしと報告している間、全画面へ常時表示する帯。
 * 取得の失敗表示は取りに行って初めて出るが、この帯は取得の有無に関わらず出るので、
 * 画面に残っている数字が古いことを先に知らせられる。
 * デモモードは通信を使わないため重ねない(模擬データは圏外でも古くならない)
 */
export function OfflineBanner() {
  const { settings } = useSettings();
  const offline = useOffline();
  const copy = useCopy();
  const shown = offline && !settings.demoMode;

  // 帯が出た瞬間に読み上げる。iOS には live region が無く、出ただけでは VoiceOver に伝わらない
  useEffect(() => {
    if (shown) AccessibilityInfo.announceForAccessibility(spokenCopy('offlineBanner'));
  }, [shown]);

  if (!shown) return null;
  return <StatusBanner color={AppColors.ink} dotColor={AppColors.none} text={copy.offlineBanner} />;
}
