import {
  AREA_LAYERS,
  FLOOD_ATTRIBUTION,
  hazardLayer,
  type HazardLegendEntry,
} from '@/constants/hazard-map';
import { POPULATION_ATTRIBUTION, POPULATION_BUCKETS } from '@/constants/population-map';
import {
  FUKUCHIYAMA_FAULT,
  QUAKE_ATTRIBUTION,
  QUAKE_BUCKETS,
  QUAKE_FAULT_LINE,
} from '@/constants/quake-map';

import { AREA_KEYS, type AreaKey, type FillKey, type MapLayerState } from './map-layers';
import type { CopyKey } from './plain-japanese-copy';

/** 凡例の1まとまり(レイヤー1つぶん)。凡例ストリップとレイヤー選択シートの両方が使う */
export type LegendBlock = {
  key: string;
  /** 正式名称。シートの凡例の見出しに使い、やさしい日本語モードでも変えない */
  title: string;
  /** 1行の帯で色見本の前に置く短い名前。同じ区分名(警戒区域)を持つ区域を見分けるため */
  short: string;
  entries: readonly HazardLegendEntry[];
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

export function fillLegend(fill: FillKey, copy: Copy, easy: boolean): LegendBlock | null {
  switch (fill) {
    case 'none':
      return null;
    case 'flood': {
      const layer = hazardLayer('flood');
      return {
        key: 'flood',
        title: layer.title,
        short: easy ? layer.labelEasy : layer.label,
        entries: layer.legend,
        attribution: FLOOD_ATTRIBUTION,
        scale: true,
      };
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
    case 'population':
      return {
        key: 'population',
        title: copy.populationLegendTitle,
        short: copy.fillPopulation,
        entries: POPULATION_BUCKETS.map((b) => ({ color: b.fill, label: b.label })),
        attribution: POPULATION_ATTRIBUTION,
        scale: true,
      };
  }
}

/** 区域はタイルごとに凡例を分ける(土砂災害は土石流と急傾斜地で色が違うため) */
export function areaLegend(area: AreaKey, easy: boolean): LegendBlock[] {
  return AREA_LAYERS[area].map((key) => {
    const layer = hazardLayer(key);
    return {
      key,
      title: layer.title,
      short: easy ? layer.labelEasy : layer.label,
      entries: layer.legend,
      attribution: FLOOD_ATTRIBUTION,
      scale: false,
    };
  });
}

/** 地図に出ている塗りと区域の凡例を、描画順(塗り → 区域)に並べる */
export function legendBlocks(state: MapLayerState, copy: Copy, easy: boolean): LegendBlock[] {
  const blocks: LegendBlock[] = [];
  const fill = fillLegend(state.fill, copy, easy);
  if (fill) blocks.push(fill);
  for (const area of AREA_KEYS) {
    if (state.areas[area]) blocks.push(...areaLegend(area, easy));
  }
  return blocks;
}

/** 出典表記(NF-06)。同じ提供元のレイヤーが複数出ていても1行にまとめる */
export function legendAttributions(blocks: readonly LegendBlock[]): string[] {
  return [...new Set(blocks.map((b) => b.attribution))];
}
