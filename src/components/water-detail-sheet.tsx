import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusChip } from '@/components/status-chip';
import { AppColors } from '@/constants/tokens';
import type { WaterLevel } from '@/domain/models';
import { waterStatus, WATER_STATUS_COLOR } from '@/domain/status';
import { useCopy, useStatusLabels } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';
import { formatJst } from '@/utils/datetime';

type Props = {
  waterLevel: WaterLevel;
  onClose: () => void;
};

/**
 * 水位観測点ピンをタップしたときの詳細シート。
 * ネイティブの吹き出し(Callout)は New Architecture で開閉が不安定なため、
 * 避難所と同じ自前シートで出す。
 */
export function WaterDetailSheet({ waterLevel, onClose }: Props) {
  const labels = useStatusLabels();
  const copy = useCopy();
  const easy = useEasyJapanese();
  const status = waterStatus(waterLevel.levelCm, waterLevel.alertLevelCm);
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <StatusChip label={labels.water[status]} color={WATER_STATUS_COLOR[status]} />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.name}>{waterLevel.name}</AppText>
      <AppText style={styles.kind}>{labels.waterKind[waterLevel.kind]}</AppText>

      <AppText style={styles.values}>
        {/* 欠測は — で示す(0 と区別する) */}
        {copy.waterNowLabel} {waterLevel.levelCm ?? '—'}cm / {copy.waterAlertLabel}{' '}
        {waterLevel.alertLevelCm ?? '—'}cm ・ {formatJst(waterLevel.measuredAt, easy)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: '#14283C',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.line,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    fontSize: 15,
    color: AppColors.inkSub,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.ink,
    marginTop: 6,
  },
  kind: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 2,
  },
  values: {
    fontSize: 13,
    color: AppColors.ink,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
});
