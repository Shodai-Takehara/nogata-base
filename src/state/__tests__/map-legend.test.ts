import { FLOOD_ATTRIBUTION, FLOOD_LEGEND } from '@/constants/hazard-map';
import { POPULATION_ATTRIBUTION } from '@/constants/population-map';
import { FUKUCHIYAMA_FAULT, QUAKE_ATTRIBUTION, QUAKE_BUCKETS } from '@/constants/quake-map';
import { INITIAL_MAP_LAYERS, mapLayersReducer, type MapLayerState } from '@/state/map-layers';
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

  it('地震の塗りは5段階の帯に、断層線の見本と注意書きを添える(F-15 の受入条件)', () => {
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
    // 区分名が同じなので、帯では短い名前で種別を見分けさせる(F-07 の受入条件)
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
  });
});
