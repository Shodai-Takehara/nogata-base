import {
  FLOOD_ATTRIBUTION,
  FLOOD_LEGEND,
  LANDFORM_ATTRIBUTION,
  LANDFORM_LEGEND,
} from '@/constants/hazard-map';
import { POPULATION_ATTRIBUTION } from '@/constants/population-map';
import { FUKUCHIYAMA_FAULT, QUAKE_ATTRIBUTION, QUAKE_BUCKETS } from '@/constants/quake-map';
import {
  FILL_KEYS,
  INITIAL_MAP_LAYERS,
  mapLayersReducer,
  type MapLayerState,
} from '@/state/map-layers';
import { legendAttributions, legendBlocks } from '@/state/map-legend';
import { PLAIN_JAPANESE_COPY, type CopyKey } from '@/state/plain-japanese-copy';

const copy = Object.fromEntries(
  Object.entries(PLAIN_JAPANESE_COPY).map(([key, entry]) => [key, entry.standard]),
) as Record<CopyKey, string>;

function withFill(fill: MapLayerState['fill']): MapLayerState {
  return mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill });
}

describe('凡例のまとまり', () => {
  it('既定状態では凡例が無い', () => {
    expect(legendBlocks(INITIAL_MAP_LAYERS, copy, false)).toEqual([]);
  });

  it('洪水の塗りは浸水深6段階の帯として出す', () => {
    const [block] = legendBlocks(withFill('flood'), copy, false);
    expect(block.scale).toBe(true);
    expect(block.entries).toEqual(FLOOD_LEGEND);
    expect(block.attribution).toBe(FLOOD_ATTRIBUTION);
  });

  it('人口は見出しを文言カタログから引く(平易版があるため)', () => {
    const state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'togglePopulation' });
    const [block] = legendBlocks(state, copy, false);
    expect(block.title).toBe(copy.populationLegendTitle);
    expect(block.attribution).toBe(POPULATION_ATTRIBUTION);
    expect(block.entries).toHaveLength(4);
  });

  it('地震の塗りは5段階の帯に、断層線の見本と注意書きを添える', () => {
    const [block] = legendBlocks(withFill('quake'), copy, false);
    expect(block.scale).toBe(true);
    expect(block.title).toBe(copy.quakeLegendTitle);
    expect(block.entries.map((e) => e.label)).toEqual(QUAKE_BUCKETS.map((b) => b.label));
    expect(block.attribution).toBe(QUAKE_ATTRIBUTION);
    expect(block.line?.label).toBe(copy.quakeFaultLegend);
    expect(block.line?.detail).toContain(FUKUCHIYAMA_FAULT.magnitude);
    expect(block.line?.detailAttribution).toBe(FUKUCHIYAMA_FAULT.attribution);
    expect(block.note).toBe(copy.quakeNote);
  });

  it('地形分類は9区分の見本だけを帯に出し、範囲外の注意書きと国土地理院の出典を持つ', () => {
    const [block] = legendBlocks(withFill('landform'), copy, false);
    expect(block.scale).toBe(false);
    expect(block.compact).toBe(true);
    expect(block.title).toBe('治水地形分類図');
    expect(block.short).toBe('地形');
    expect(block.entries.map((e) => [e.color, e.stripe, e.label])).toEqual(
      LANDFORM_LEGEND.map((e) => [e.color, e.stripe, e.label]),
    );
    expect(block.attribution).toBe(LANDFORM_ATTRIBUTION);
    expect(block.note).toBe(copy.landformNote);
    expect(block.line).toBeUndefined();
    expect(legendBlocks(withFill('landform'), copy, true)[0].short).toBe('地形(ちけい)');
  });

  it('地形分類の各区分には一言が付き、やさしい日本語モードでは平易版になる', () => {
    const [standard] = legendBlocks(withFill('landform'), copy, false);
    const [easy] = legendBlocks(withFill('landform'), copy, true);
    expect(standard.entries.map((e) => e.label)).toEqual(LANDFORM_LEGEND.map((e) => e.label));
    standard.entries.forEach((entry, i) => {
      expect(entry.note).toBe(LANDFORM_LEGEND[i].note?.standard);
      expect(easy.entries[i].note).toBe(LANDFORM_LEGEND[i].note?.easy);
    });
    // 洪水と区域の凡例は区分名で足りる(浸水深や警戒区域は名前が意味を持つ)
    for (const block of legendBlocks(withFill('flood'), copy, false)) {
      for (const entry of block.entries) expect(entry.note).toBeUndefined();
    }
  });

  it('見本だけの帯は地形分類にだけ使う(洪水、人口、区域は区分名か両端のラベルが要る)', () => {
    let state = withFill('flood');
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    for (const block of legendBlocks(state, copy, false)) expect(block.compact).toBeUndefined();
  });

  it('見本だけの帯は区分ごとの凡例にしか使わない(段階の帯は両端のラベルで読ませる)', () => {
    for (const fill of FILL_KEYS) {
      for (const block of legendBlocks(withFill(fill), copy, false)) {
        if (block.compact) expect(block.scale).toBe(false);
      }
    }
  });

  it('断層線の見本と注意書きは地震の塗りにだけ付く', () => {
    const [flood] = legendBlocks(withFill('flood'), copy, false);
    const [population] = legendBlocks(
      mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'togglePopulation' }),
      copy,
      false,
    );
    for (const block of [flood, population]) {
      expect(block.line).toBeUndefined();
      expect(block.note).toBeUndefined();
    }
  });

  it('土砂災害の区域は土石流と急傾斜地の2つに分かれ、それぞれ警戒と特別警戒を持つ', () => {
    const state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'toggleArea', key: 'landslide' });
    const blocks = legendBlocks(state, copy, false);
    expect(blocks.map((b) => b.key)).toEqual(['debrisFlow', 'steepSlope']);
    // 区分名が同じなので、帯では短い名前で種別を見分けさせる
    expect(blocks.map((b) => b.short)).toEqual(['土石流', '急傾斜地']);
    for (const block of blocks) {
      expect(block.scale).toBe(false);
      expect(block.entries.map((e) => e.label)).toEqual(['警戒区域', '特別警戒区域']);
    }
  });

  it('やさしい日本語モードでは短い名前に読みが付き、正式名称は変わらない', () => {
    const state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'toggleArea', key: 'landslide' });
    const [debris] = legendBlocks(state, copy, true);
    expect(debris.short).toBe('土石流(どせきりゅう)');
    expect(debris.title).toBe('土砂災害警戒区域(土石流)');
  });

  it('人口 → 塗り → 区域の順に並ぶ(地図の描画順、下から上と同じ)', () => {
    let state = withFill('flood');
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'houseCollapse' });
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(legendBlocks(state, copy, false).map((b) => b.key)).toEqual([
      'population',
      'flood',
      'debrisFlow',
      'steepSlope',
      'houseCollapse',
    ]);
  });

  it('出典は提供元ごとに1行にまとめる', () => {
    let state = withFill('flood');
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    expect(legendAttributions(legendBlocks(state, copy, false))).toEqual([FLOOD_ATTRIBUTION]);

    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(legendAttributions(legendBlocks(state, copy, false))).toEqual([
      POPULATION_ATTRIBUTION,
      FLOOD_ATTRIBUTION,
    ]);

    // 地形分類に切り替えると国土地理院が加わり、区域のぶんのポータルは残る(人口は外れる)
    state = mapLayersReducer(state, { type: 'setFill', fill: 'landform' });
    expect(legendAttributions(legendBlocks(state, copy, false))).toEqual([
      LANDFORM_ATTRIBUTION,
      FLOOD_ATTRIBUTION,
    ]);
  });
});
