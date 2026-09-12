import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusChip } from '@/components/status-chip';
import { AppColors } from '@/constants/tokens';
import type { TrafficRegulation } from '@/domain/models';
import { TRAFFIC_SEVERITY_COLOR, trafficSeverity } from '@/domain/status';
import { useCopy } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';
import { formatJstMoment } from '@/utils/datetime';

type Props = {
  regulation: TrafficRegulation;
  onClose: () => void;
};

/**
 * 交通規制の線をタップしたときの詳細シート。
 * 規制種別・備考は API 由来の日本語をそのまま出す。
 */
export function TrafficDetailSheet({ regulation, onClose }: Props) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <StatusChip
          label={regulation.status}
          color={TRAFFIC_SEVERITY_COLOR[trafficSeverity(regulation.status)]}
        />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      {regulation.note ? <AppText style={styles.note}>{regulation.note}</AppText> : null}

      <View style={styles.timeRow}>
        <AppText style={styles.timeLabel}>{copy.trafficStart}</AppText>
        <AppText style={styles.timeValue}>{formatJstMoment(regulation.startAt, easy)}</AppText>
      </View>
      <View style={styles.timeRow}>
        <AppText style={styles.timeLabel}>{copy.trafficEnd}</AppText>
        <AppText style={styles.timeValue}>
          {regulation.endAt != null
            ? formatJstMoment(regulation.endAt, easy)
            : copy.trafficEndUndecided}
        </AppText>
      </View>
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
  note: {
    fontSize: 13,
    color: AppColors.ink,
    lineHeight: 19,
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  timeLabel: {
    fontSize: 10,
    color: AppColors.inkSub,
    width: 64,
  },
  timeValue: {
    fontSize: 12,
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
});
