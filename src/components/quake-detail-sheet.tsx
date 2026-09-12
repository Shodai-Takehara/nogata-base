import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { QUAKE_ATTRIBUTION, type QuakeCell } from '@/constants/quake-map';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';
import { quakeDetail } from '@/state/quake-detail';
import { useEasyJapanese } from '@/state/settings';

type Props = {
  cell: QuakeCell;
  onClose: () => void;
};

/**
 * 地震ハザードのセルをタップしたときの詳細シート(S-05)。
 * 主値の横に区分名と色見本を置き、地図の塗りのどの段階かを読めるようにする
 */
export function QuakeDetailSheet({ cell, onClose }: Props) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  const detail = quakeDetail(cell, copy, easy);
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <AppText style={styles.title}>{copy.quakeSheetTitle}</AppText>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.mainLabel}>{detail.main.label}</AppText>
      <View style={styles.mainLine}>
        <AppText style={styles.value}>{detail.main.value}</AppText>
        <View style={styles.bucket}>
          <View style={[styles.swatch, { backgroundColor: detail.main.color }]} />
          <AppText style={styles.bucketLabel}>{detail.main.bucket}</AppText>
        </View>
      </View>

      {detail.subs.map((sub) => (
        <AppText key={sub.label} style={styles.sub}>
          {sub.label}: {sub.value}
        </AppText>
      ))}
      <AppText style={styles.sub}>
        {copy.quakeGroundLabel}: {detail.ground}
      </AppText>
      {detail.amplification ? (
        <AppText style={styles.sub}>
          {copy.quakeAmpLabel}: {detail.amplification}
        </AppText>
      ) : null}

      <AppText style={styles.note}>{copy.quakeNote}</AppText>
      <AppText style={[styles.note, styles.noteFollow]}>{copy.quakeMeshNote}</AppText>
      <AppText style={styles.source}>{QUAKE_ATTRIBUTION}</AppText>
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
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.ink,
  },
  close: {
    fontSize: 15,
    color: AppColors.inkSub,
  },
  mainLabel: {
    fontSize: 13,
    color: AppColors.ink,
    marginTop: 6,
  },
  mainLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  bucket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  bucketLabel: {
    fontSize: 12,
    color: AppColors.inkSub,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    fontSize: 13,
    color: AppColors.ink,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 8,
  },
  noteFollow: {
    marginTop: 2,
  },
  source: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 4,
  },
});
