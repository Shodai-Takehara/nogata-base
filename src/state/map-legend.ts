import {
  AREA_LAYERS,
  FLOOD_ATTRIBUTION,
  hazardLayer,
  type HazardLegendEntry,
} from '@/constants/hazard-map';
import { POPULATION_ATTRIBUTION, POPULATION_BUCKETS } from '@/constants/population-map';

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
