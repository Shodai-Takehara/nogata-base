import { AREA_LAYERS } from '@/constants/hazard-map';
import {
  AREA_KEYS,
  FILL_KEYS,
  INITIAL_MAP_LAYERS,
  mapLayersReducer,
  overlayCount,
  PIN_KEYS,
  type MapLayerState,
} from '@/state/map-layers';

describe('地図レイヤーの状態', () => {
  it('既定はピンが表示、塗りと区域が非表示', () => {
    expect(INITIAL_MAP_LAYERS).toEqual({
      pins: { shelters: true, carShelters: true, water: true, damage: true, traffic: true },
      fill: 'none',
      areas: { landslide: false, houseCollapse: false },
    });
  });

  it('一覧の順番を決める配列が、状態のキーと区域の定義を漏れなく持つ', () => {
    expect([...PIN_KEYS].sort()).toEqual(Object.keys(INITIAL_MAP_LAYERS.pins).sort());
    expect([...AREA_KEYS].sort()).toEqual(Object.keys(INITIAL_MAP_LAYERS.areas).sort());
    expect([...AREA_KEYS]).toEqual(Object.keys(AREA_LAYERS));
    expect(FILL_KEYS[0]).toBe('none');
  });

  it('塗りを選ぶと前の塗りが外れる(同時に1つしか読めないため)', () => {
    const flood = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'flood' });
    expect(flood.fill).toBe('flood');
    const population = mapLayersReducer(flood, { type: 'setFill', fill: 'population' });
    expect(population.fill).toBe('population');
    expect(mapLayersReducer(population, { type: 'setFill', fill: 'none' }).fill).toBe('none');
  });

  it('同じ塗りを選び直しても状態オブジェクトは変わらない(再描画を起こさない)', () => {
    const flood = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'flood' });
    expect(mapLayersReducer(flood, { type: 'setFill', fill: 'flood' })).toBe(flood);
  });

  it('ピンと区域の切替は互いに影響しない', () => {
    let state: MapLayerState = INITIAL_MAP_LAYERS;
    state = mapLayersReducer(state, { type: 'togglePin', key: 'water' });
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    expect(state).toEqual({
      pins: { shelters: true, carShelters: true, water: false, damage: true, traffic: true },
      fill: 'none',
      areas: { landslide: true, houseCollapse: false },
    });
    // 塗りを選んでも区域とピンはそのまま残る
    state = mapLayersReducer(state, { type: 'setFill', fill: 'population' });
    expect(state.areas.landslide).toBe(true);
    expect(state.pins.water).toBe(false);
  });

  it('切替は2回で元に戻る', () => {
    const once = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'toggleArea', key: 'houseCollapse' });
    const twice = mapLayersReducer(once, { type: 'toggleArea', key: 'houseCollapse' });
    expect(twice).toEqual(INITIAL_MAP_LAYERS);
  });

  it('その他タブからの遷移で塗りが洪水になり、他は変わらない', () => {
    const withArea = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'toggleArea', key: 'landslide' });
    const linked = mapLayersReducer(withArea, { type: 'applyDeepLink', link: 'hazard' });
    expect(linked.fill).toBe('flood');
    expect(linked.areas).toEqual(withArea.areas);
    expect(linked.pins).toEqual(withArea.pins);
  });

  it('人口を見ている最中の遷移でも塗りは洪水に置き換わる', () => {
    const population = mapLayersReducer(INITIAL_MAP_LAYERS, {
      type: 'setFill',
      fill: 'population',
    });
    expect(mapLayersReducer(population, { type: 'applyDeepLink', link: 'hazard' }).fill).toBe(
      'flood',
    );
  });

  it('バッジの数は塗り(最大1)と区域の数で、ピンは数えない', () => {
    expect(overlayCount(INITIAL_MAP_LAYERS)).toBe(0);
    let state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'flood' });
    expect(overlayCount(state)).toBe(1);
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'houseCollapse' });
    expect(overlayCount(state)).toBe(3);
    state = mapLayersReducer(state, { type: 'togglePin', key: 'shelters' });
    expect(overlayCount(state)).toBe(3);
  });
});
