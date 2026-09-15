import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { useOffline } from '@/state/network';
import { useCopy } from '@/state/plain-japanese';
import { useSettings } from '@/state/settings';

/**
 * 圏外のときに全画面へ常時表示する帯。画面に残っている数字が古いことを、
 * 取得の失敗表示が出る前に知らせる(電波が弱いと失敗まで15秒かかる)。
 * デモモードは通信を使わず、デモの帯が「通信は行いません」と言っているため重ねない
 */
export function OfflineBanner() {
  const { settings } = useSettings();
  const offline = useOffline();
  const copy = useCopy();
  if (!offline || settings.demoMode) return null;
  return (
    <View style={styles.banner} accessibilityRole="text" accessibilityLiveRegion="polite">
      <View style={styles.dot} />
      <AppText style={styles.text}>{copy.offlineBanner}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AppColors.ink,
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
    backgroundColor: AppColors.none,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
