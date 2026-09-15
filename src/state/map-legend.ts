import { AREA_LAYERS, hazardLayer, type HazardLegendEntry } from '@/constants/hazard-map';
import { POPULATION_ATTRIBUTION, POPULATION_BUCKETS } from '@/constants/population-map';
import {
  FUKUCHIYAMA_FAULT,
  QUAKE_ATTRIBUTION,
  QUAKE_BUCKETS,
  QUAKE_FAULT_LINE,
} from '@/constants/quake-map';

import { AREA_KEYS, type AreaKey, type FillKey, type MapLayerState } from './map-layers';
import type { CopyKey } from './plain-japanese-copy';

/** 凡例の項目。一言は表示モードに合わせて選んだあとの文 */
export type LegendEntry = {
  color: string;
  label: string;
  stripe?: string;
  /** シートの凡例で区分名の横の ⓘ から出す一言。地図上の帯には載せない */
  note?: string;
};

/** 凡例の1まとまり(レイヤー1つぶん)。凡例ストリップとレイヤー選択シートの両方が使う */
export type LegendBlock = {
  key: string;
  /** 正式名称。シートの凡例の見出しに使い、やさしい日本語モードでも変えない */
  title: string;
  /** 1行の帯で色見本の前に置く短い名前。同じ区分名(警戒区域)を持つ区域を見分けるため */
  short: string;
  entries: readonly LegendEntry[];
  attribution: string;
  /**
   * 色が連続した段階(浸水深、人数)なら true。ストリップでは色見本を帯にして
   * 両端のラベルだけ出す。false は区分ごとに名前が要る(警戒区域、特別警戒区域)
   */
  scale: boolean;
  /**
   * 塗りと一緒に描く線(断層)。地図上の帯には載せず、シートの凡例にだけ出す。
   * 帯は塗りの段階を読ませる場所で、線まで足すと1行に収まらない
   */
  line?: LegendLine;
  /** 読み方の注意。シートの凡例にだけ出す */
  note?: string;
  /**
   * 帯では色見本だけ並べ、区分名はシートで読ませる。地形分類のように区分が9つあると
   * 名前まで並べた帯が3行になり、地図を隠すため
   */
  compact?: boolean;
};

export type LegendLine = {
  color: string;
  width: number;
  dashPattern: readonly number[];
  label: string;
  /** 線そのものとは別の出典を持つ補足(断層の規模と発生確率) */
  detail?: string;
  detailAttribution?: string;
};

type Copy = Record<CopyKey, string>;

function legendEntries(entries: readonly HazardLegendEntry[], easy: boolean): LegendEntry[] {
  return entries.map(({ color, label, stripe, note }) => ({
    color,
    label,
    stripe,
    note: note && (easy ? note.easy : note.standard),
  }));
}

export function fillLegend(fill: FillKey, copy: Copy, easy: boolean): LegendBlock | null {
  switch (fill) {
    case 'none':
      return null;
    case 'flood':
    case 'landform': {
      const layer = hazardLayer(fill);
      const block = {
        key: fill,
        title: layer.title,
        short: easy ? layer.labelEasy : layer.label,
        entries: legendEntries(layer.legend, easy),
        attribution: layer.attribution,
      };
      return fill === 'flood'
        ? { ...block, scale: true, note: copy.floodNote }
        : { ...block, scale: false, compact: true, note: copy.landformNote };
    }
    case 'quake':
      return {
        key: 'quake',
        title: copy.quakeLegendTitle,
        short: copy.fillQuake,
        entries: QUAKE_BUCKETS.map((b) => ({ color: b.fill, label: b.label })),
        attribution: QUAKE_ATTRIBUTION,
        scale: true,
        line: {
          color: QUAKE_FAULT_LINE.color,
          width: QUAKE_FAULT_LINE.width,
          dashPattern: QUAKE_FAULT_LINE.dashPattern,
          label: copy.quakeFaultLegend,
          detail: `${FUKUCHIYAMA_FAULT.magnitude}、${FUKUCHIYAMA_FAULT.probability}`,
          detailAttribution: FUKUCHIYAMA_FAULT.attribution,
        },
        note: copy.quakeNote,
      };
  }
}

/** 人口メッシュの凡例。塗りの下に敷くので、帯でも塗りより前に置く */
export function populationLegend(copy: Copy): LegendBlock {
  return {
    key: 'population',
    title: copy.populationLegendTitle,
    short: copy.areaPopulation,
    entries: POPULATION_BUCKETS.map((b) => ({ color: b.fill, label: b.label })),
    attribution: POPULATION_ATTRIBUTION,
    scale: true,
  };
}

/**
 * 区域の凡例はタイルごとに分ける(土砂災害は土石流と急傾斜地で色が違うため)。
 * ただし正式名称が同じタイル(家屋倒壊等氾濫想定区域の氾濫流と河岸侵食)は、
 * 帯に同じ短い名前が2度並ばないよう1つの凡例にまとめる。出典が違うタイルはまとめない
 * (まとめると片方の出典表記が落ちる)
 */
export function areaLegend(area: AreaKey, easy: boolean): LegendBlock[] {
  const blocks: LegendBlock[] = [];
  for (const key of AREA_LAYERS[area]) {
    const layer = hazardLayer(key);
    const entries = legendEntries(layer.legend, easy);
    const same = blocks.findIndex(
      (b) => b.title === layer.title && b.attribution === layer.attribution,
    );
    if (same >= 0) {
      blocks[same] = { ...blocks[same], entries: [...blocks[same].entries, ...entries] };
      continue;
    }
    blocks.push({
      key,
      title: layer.title,
      short: easy ? layer.labelEasy : layer.label,
      entries,
      attribution: layer.attribution,
      scale: false,
    });
  }
  return blocks;
}

/** 地図に出ている人口、塗り、区域の凡例を、描画順(下から上)に並べる */
export function legendBlocks(state: MapLayerState, copy: Copy, easy: boolean): LegendBlock[] {
  const blocks: LegendBlock[] = [];
  if (state.population) blocks.push(populationLegend(copy));
  const fill = fillLegend(state.fill, copy, easy);
  if (fill) blocks.push(fill);
  for (const area of AREA_KEYS) {
    if (state.areas[area]) blocks.push(...areaLegend(area, easy));
  }
  return blocks;
}

/** 出典表記。同じ提供元のレイヤーが複数出ていても1行にまとめる */
export function legendAttributions(blocks: readonly LegendBlock[]): string[] {
  return [...new Set(blocks.map((b) => b.attribution))];
}
