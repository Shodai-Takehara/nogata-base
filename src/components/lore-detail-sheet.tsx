import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { LORE_ATTRIBUTION, type LoreMonument } from '@/constants/lore-monuments';
import { AppColors } from '@/constants/tokens';
import { formatBuiltYear } from '@/state/lore-detail';
import { useCopy } from '@/state/plain-japanese';
import { openPlaceInMaps } from '@/utils/route-link';

type Props = {
  monument: LoreMonument;
  onClose: () => void;
};

/**
 * 伝承内容が画面高に占める上限。要約(0.4)より低くし、碑名・災害名・ボタンを足しても
 * シート全体が要約を開いたときと同じ程度の高さに収まるようにする
 */
const STORY_HEIGHT_RATIO = 0.28;

/**
 * 自然災害伝承碑のピンをタップしたときの詳細シート。
 * 碑名、災害名、伝承内容は固有名詞と歴史の記述なので、やさしい日本語モードでも原文のまま出す
 */
export function LoreDetailSheet({ monument, onClose }: Props) {
  const copy = useCopy();
  const { height: windowHeight } = useWindowDimensions();
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{copy.loreSheetTitle}</AppText>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={copy.close}>
          <AppText style={styles.close}>✕</AppText>
        </Pressable>
      </View>

      <AppText style={styles.name}>{monument.name}</AppText>
      <AppText style={styles.address}>{monument.address}</AppText>

      <View style={styles.facts}>
        <Fact label={copy.loreDisaster} value={monument.disaster} />
        <Fact label={copy.loreBuiltYear} value={formatBuiltYear(monument.builtYear)} />
      </View>

      <AppText style={styles.storyLabel}>{copy.loreStory}</AppText>
      <ScrollView style={{ maxHeight: windowHeight * STORY_HEIGHT_RATIO }}>
        <AppText style={styles.story}>{monument.story}</AppText>
      </ScrollView>
      <AppText style={styles.note}>{copy.loreStoryNote}</AppText>
      <AppText style={styles.source}>{LORE_ATTRIBUTION}</AppText>

      <Pressable
        style={styles.routeButton}
        accessibilityRole="button"
        accessibilityLabel={`${monument.name}の場所を地図アプリで見る`}
        onPress={() => openPlaceInMaps(monument.coord, monument.name)}>
        <AppText style={styles.routeText}>{copy.loreRouteButton}</AppText>
      </Pressable>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText style={styles.factLabel}>{label}</AppText>
      <AppText style={styles.factValue}>{value}</AppText>
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
  badge: {
    backgroundColor: AppColors.primaryDeep,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    // 平易版の見出し(読み付きで長い)が特大文字で折り返しても、✕ を行の外へ押し出さない
    flexShrink: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  address: {
    fontSize: 12,
    color: AppColors.inkSub,
    marginTop: 2,
  },
  facts: {
    marginTop: 8,
    gap: 2,
  },
  fact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  factLabel: {
    fontSize: 12,
    color: AppColors.inkSub,
  },
  factValue: {
    fontSize: 13,
    color: AppColors.ink,
    flexShrink: 1,
  },
  storyLabel: {
    fontSize: 12,
    color: AppColors.inkSub,
    marginTop: 10,
  },
  story: {
    fontSize: 13,
    lineHeight: 20,
    color: AppColors.ink,
    marginTop: 2,
  },
  note: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 6,
  },
  source: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 4,
  },
  routeButton: {
    marginTop: 12,
    backgroundColor: AppColors.primaryDeep,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  routeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
