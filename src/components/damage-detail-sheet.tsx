import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusChip } from '@/components/status-chip';
import { AppColors } from '@/constants/tokens';
import type { DamageReport } from '@/domain/models';
import { useCopy } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';
import { formatJst } from '@/utils/datetime';

type Props = {
  report: DamageReport;
  onClose: () => void;
};

/**
 * 被害報告ピンをタップしたときの詳細シート。
 * 種別・作業結果・本部コメントは API 由来の日本語をそのまま出す
 * (自由記述のためやさしい日本語の変換対象外)。
 */
export function DamageDetailSheet({ report, onClose }: Props) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <StatusChip label={report.category} color={AppColors.caution} />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.reportedAt}>{formatJst(report.reportedAt, easy)}</AppText>

      {report.workResult ? (
        <>
          <AppText style={styles.sectionLabel}>{copy.damageWorkResult}</AppText>
          <AppText style={styles.body}>{report.workResult}</AppText>
        </>
      ) : null}

      {report.hqNote ? (
        <>
          <AppText style={styles.sectionLabel}>{copy.damageHqNote}</AppText>
          {/* 本部コメントは行動指示を含むことがあるため、注意色で目立たせる */}
          <AppText style={styles.hqNote}>{report.hqNote}</AppText>
        </>
      ) : null}
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
  reportedAt: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 10,
    color: AppColors.inkSub,
    marginTop: 10,
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    color: AppColors.ink,
    lineHeight: 19,
  },
  hqNote: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.caution,
    lineHeight: 19,
  },
});
