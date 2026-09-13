import type { Dispatch } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { LegendSwatch, type SwatchEntry } from '@/components/legend-swatch';
import { AppColors } from '@/constants/tokens';
import {
  AREA_KEYS,
  FILL_KEYS,
  PIN_KEYS,
  type AreaKey,
  type FillKey,
  type MapLayerAction,
  type MapLayerState,
  type PinLayerKey,
} from '@/state/map-layers';
import {
  areaLegend,
  fillLegend,
  populationLegend,
  type LegendBlock,
  type LegendLine,
} from '@/state/map-legend';
import { useCopy } from '@/state/plain-japanese';
import { useEasyJapanese } from '@/state/settings';

type Props = {
  state: MapLayerState;
  dispatch: Dispatch<MapLayerAction>;
  /** 洪水の浸水想定の下に置く AR への導線 */
  onOpenAr: () => void;
};

/** ピンの色見本。地図上のピン画像の主色に合わせる(車中泊と被害は画像が単色でないため代表色) */
const PIN_COLOR: Record<PinLayerKey, string> = {
  shelters: AppColors.ok,
  carShelters: AppColors.primary,
  water: AppColors.waterCalm,
  damage: AppColors.caution,
  traffic: AppColors.danger,
};

/**
 * レイヤー選択シートの中身。ピンと区域は切替、塗りは1つ選ぶラジオにして、
 * 排他を UI の形で伝える。選ばれている塗りと有効な区域の下には凡例の全文を出し、
 * 地図に戻ったあと凡例ストリップの色見本と対応が取れるようにする
 */
export function LayerPicker({ state, dispatch, onOpenAr }: Props) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  const pinLabel: Record<PinLayerKey, string> = {
    shelters: copy.layerShelters,
    carShelters: copy.layerCarShelters,
    water: copy.layerWater,
    damage: copy.layerDamage,
    traffic: copy.layerTraffic,
  };
  const fillLabel: Record<FillKey, { label: string; desc?: string }> = {
    none: { label: copy.fillNone },
    flood: { label: copy.fillFlood, desc: copy.fillFloodDesc },
    quake: { label: copy.fillQuake, desc: copy.fillQuakeDesc },
    landform: { label: copy.fillLandform, desc: copy.fillLandformDesc },
  };
  const areaLabel: Record<AreaKey, string> = {
    landslide: copy.areaLandslide,
    houseCollapse: copy.areaHouseCollapse,
  };
  const population = populationLegend(copy);

  return (
    <View style={styles.body}>
      <SectionTitle title={copy.layerSectionNow} />
      {PIN_KEYS.map((key) => (
        <ToggleRow
          key={key}
          label={pinLabel[key]}
          on={state.pins[key]}
          onToggle={() => dispatch({ type: 'togglePin', key })}
          swatches={[{ color: PIN_COLOR[key] }]}
          round
        />
      ))}

      <SectionTitle title={copy.layerSectionFill} />
      {FILL_KEYS.map((fill) => {
        const legend = fillLegend(fill, copy, easy);
        const selected = state.fill === fill;
        return (
          <View key={fill}>
            <Pressable
              style={styles.row}
              onPress={() => dispatch({ type: 'setFill', fill })}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, selected }}
              accessibilityLabel={fillLabel[fill].label}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.rowMain}>
                <View style={styles.labelLine}>
                  <AppText style={styles.label}>{fillLabel[fill].label}</AppText>
                  {legend ? <Swatches entries={legend.entries} /> : null}
                </View>
                {fillLabel[fill].desc ? (
                  <AppText style={styles.desc}>{fillLabel[fill].desc}</AppText>
                ) : null}
              </View>
            </Pressable>
            {selected && legend ? <LegendDetail block={legend} /> : null}
            {selected && fill === 'flood' ? (
              <Pressable style={styles.arLink} onPress={onOpenAr} accessibilityRole="link">
                <AppText style={styles.arLinkText}>{copy.summaryArLink}</AppText>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <SectionTitle title={copy.layerSectionAreas} />
      {AREA_KEYS.map((area) => {
        const blocks = areaLegend(area, easy);
        return (
          <View key={area}>
            <ToggleRow
              label={areaLabel[area]}
              on={state.areas[area]}
              onToggle={() => dispatch({ type: 'toggleArea', key: area })}
              swatches={blocks.flatMap((b) => b.entries)}
            />
            {state.areas[area]
              ? blocks.map((block) => <LegendDetail key={block.key} block={block} />)
              : null}
          </View>
        );
      })}
      {/* 人口は塗りと重ねる切替(map-layers.ts)。見出しを増やさず区域の並びに置く */}
      <ToggleRow
        label={copy.areaPopulation}
        desc={copy.areaPopulationDesc}
        on={state.population}
        onToggle={() => dispatch({ type: 'togglePopulation' })}
        swatches={population.entries}
      />
      {state.population ? <LegendDetail block={population} /> : null}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <AppText style={styles.sectionTitle}>{title}</AppText>;
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
  swatches,
  round,
}: {
  label: string;
  desc?: string;
  on: boolean;
  onToggle: () => void;
  swatches: readonly SwatchEntry[];
  round?: boolean;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      accessibilityHint={desc}>
      <View style={styles.rowMain}>
        <View style={styles.labelLine}>
          <Swatches entries={swatches} round={round} />
          <AppText style={styles.label}>{label}</AppText>
        </View>
        {desc ? <AppText style={styles.desc}>{desc}</AppText> : null}
      </View>
      {/* 行全体を押せるようにし、スイッチ自体は触れない見た目だけの部品にする。
          スイッチにも押下を持たせると、iOS で行とスイッチの両方が反応して2回切り替わりうる */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Switch value={on} trackColor={{ true: AppColors.primary }} />
      </View>
    </Pressable>
  );
}

function Swatches({ entries, round }: { entries: readonly SwatchEntry[]; round?: boolean }) {
  return (
    <View style={styles.swatches}>
      {entries.map((entry) => (
        <LegendSwatch key={entry.color} entry={entry} round={round} />
      ))}
    </View>
  );
}

/** 凡例の全文。見出しは正式名称なので、やさしい日本語モードでも変えない */
function LegendDetail({ block }: { block: LegendBlock }) {
  return (
    <View style={styles.legend}>
      <AppText style={styles.legendTitle}>{block.title}</AppText>
      <View style={styles.legendRows}>
        {block.entries.map((entry) => (
          <View key={entry.color} style={styles.legendRow}>
            <LegendSwatch entry={entry} />
            <AppText style={styles.legendLabel}>{entry.label}</AppText>
          </View>
        ))}
      </View>
      {block.line ? <LegendLineRow line={block.line} /> : null}
      {block.note ? <AppText style={styles.legendNote}>{block.note}</AppText> : null}
      <AppText style={styles.legendSource}>{block.attribution}</AppText>
      {block.line?.detailAttribution ? (
        <AppText style={styles.legendSource}>{block.line.detailAttribution}</AppText>
      ) : null}
    </View>
  );
}

function LegendLineRow({ line }: { line: LegendLine }) {
  return (
    <View style={styles.legendLine}>
      <DashedLineSample line={line} />
      <View style={styles.legendLineText}>
        <AppText style={styles.legendLabel}>{line.label}</AppText>
        {line.detail ? <AppText style={styles.legendLabel}>{line.detail}</AppText> : null}
      </View>
    </View>
  );
}

/**
 * 破線の見本。地図の線と同じ太さと間隔にする。
 * View の borderStyle: 'dashed' は iOS では間隔が線幅の3倍に固定され、地図の線と同じ
 * 見本にならないため、短い矩形を並べて描く
 */
function DashedLineSample({ line }: { line: LegendLine }) {
  const [dash, gap] = line.dashPattern;
  return (
    <View style={[styles.dashes, { gap }]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: dash, height: line.width, backgroundColor: line.color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.inkSub,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 操作対象は 44pt 以上(Apple Human Interface Guidelines の最小サイズ)
    minHeight: 44,
    paddingVertical: 6,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  labelLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: AppColors.ink,
  },
  desc: {
    fontSize: 11,
    color: AppColors.inkSub,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.inkSub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: AppColors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primary,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  arLink: {
    paddingVertical: 8,
    paddingLeft: 34,
  },
  arLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary,
  },
  legend: {
    marginLeft: 34,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: AppColors.paper,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.ink,
    marginBottom: 6,
  },
  legendRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  legendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  legendLineText: {
    flex: 1,
    gap: 2,
  },
  dashes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendNote: {
    fontSize: 11,
    color: AppColors.inkSub,
    marginTop: 6,
  },
  legendSource: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 6,
  },
});
