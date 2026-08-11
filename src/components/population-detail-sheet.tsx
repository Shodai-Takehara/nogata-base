import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import {
  POPULATION_AREA_ATTRIBUTION,
  POPULATION_ATTRIBUTION,
  type PopulationCell,
} from '@/constants/population-map';
import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

type Props = {
  cell: PopulationCell;
  onClose: () => void;
};

/**
 * 人口メッシュをタップしたときの詳細シート。
 * 按分の端数に確からしさを持たせないため、人数は10人単位に丸めて「約」を付ける。
 */
export function PopulationDetailSheet({ cell, onClose }: Props) {
  const copy = useCopy();
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <AppText style={styles.title}>{copy.populationSheetTitle}</AppText>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      {/* 地域名は固有名詞のため、やさしい日本語モードでも原文のまま出す(F-13) */}
      <AppText style={styles.area}>
        {cell.name}
        {copy.populationAreaSuffix}
      </AppText>

      <AppText style={styles.value}>
        {copy.approxPrefix} {roundTens(cell.pop).toLocaleString('ja-JP')}
        {copy.unitPeople}
      </AppText>
      <AppText style={styles.sub}>
        {copy.population65Label}: {copy.approxPrefix} {roundTens(cell.p65).toLocaleString('ja-JP')}
        {copy.unitPeople}
      </AppText>

      <AppText style={styles.note}>{copy.populationMeshNote}</AppText>
      <AppText style={styles.source}>{POPULATION_ATTRIBUTION}</AppText>
      <AppText style={styles.source}>{POPULATION_AREA_ATTRIBUTION}</AppText>
    </View>
  );
}

function roundTens(value: number): number {
  return Math.round(value / 10) * 10;
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
  area: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.ink,
    marginTop: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.ink,
    marginTop: 2,
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
  source: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 4,
  },
});
