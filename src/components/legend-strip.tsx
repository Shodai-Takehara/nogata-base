import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { legendAttributions, type LegendBlock } from '@/state/map-legend';
import { useCopy } from '@/state/plain-japanese';

type Props = {
  blocks: readonly LegendBlock[];
  /** ⓘ の押下。凡例の全文はレイヤー選択シートの中で読ませる(地図の上に積み上げない) */
  onExpand: () => void;
};

/**
 * 地図に出ている塗りと区域の凡例を1行にまとめた帯(S-01)。
 * 出典表記(NF-06)は塗りか区域がある間は常に見せるため、帯の2行目に置く
 */
export function LegendStrip({ blocks, onExpand }: Props) {
  const copy = useCopy();
  if (blocks.length === 0) return null;
  return (
    <View style={styles.strip}>
      <View style={styles.main}>
        <View style={styles.blocks}>
          {blocks.map((block) =>
            block.scale ? (
              <ScaleLegend key={block.key} block={block} />
            ) : (
              <ClassLegend key={block.key} block={block} />
            ),
          )}
        </View>
        <Pressable
          style={styles.expand}
          onPress={onExpand}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copy.legendExpand}>
          <AppText maxScale={STRIP_MAX_SCALE} style={styles.expandText}>
            ⓘ
          </AppText>
        </Pressable>
      </View>
      {legendAttributions(blocks).map((line) => (
        <AppText key={line} maxScale={STRIP_MAX_SCALE} style={styles.source}>
          {line}
        </AppText>
      ))}
    </View>
  );
}

/** 段階的な塗りは色見本を帯にし、両端のラベルだけ出す(全段の名前はシートで読める) */
function ScaleLegend({ block }: { block: LegendBlock }) {
  const first = block.entries[0];
  const last = block.entries[block.entries.length - 1];
  return (
    <View
      style={styles.block}
      accessible
      accessibilityLabel={`${block.title}: ${first.label}〜${last.label}`}>
      <AppText maxScale={STRIP_MAX_SCALE} style={styles.label}>
        {first.label}
      </AppText>
      <View style={styles.bar}>
        {block.entries.map((entry) => (
          <View key={entry.color} style={[styles.barStep, { backgroundColor: entry.color }]} />
        ))}
      </View>
      <AppText maxScale={STRIP_MAX_SCALE} style={styles.label}>
        {last.label}
      </AppText>
    </View>
  );
}

/** 区分ごとに色が独立している凡例は、短い名前の後ろに見本ごとの区分名を添える */
function ClassLegend({ block }: { block: LegendBlock }) {
  return (
    <View
      style={styles.block}
      accessible
      accessibilityLabel={`${block.title}: ${block.entries.map((e) => e.label).join('、')}`}>
      <AppText maxScale={STRIP_MAX_SCALE} style={styles.short}>
        {block.short}
      </AppText>
      {block.entries.map((entry) => (
        <View key={entry.color} style={styles.classItem}>
          <View style={[styles.swatch, { backgroundColor: entry.color }]} />
          <AppText maxScale={STRIP_MAX_SCALE} style={styles.label}>
            {entry.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** 地図上の帯は面積が限られるため、文字の拡大は標準相当までに抑える */
const STRIP_MAX_SCALE = 1.2;

const styles = StyleSheet.create({
  strip: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blocks: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  barStep: {
    width: 14,
    height: 11,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  swatch: {
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  label: {
    fontSize: 9.5,
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  short: {
    fontSize: 9.5,
    fontWeight: '700',
    color: AppColors.ink,
  },
  expand: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandText: {
    fontSize: 16,
    color: AppColors.primary,
  },
  source: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 3,
  },
});
