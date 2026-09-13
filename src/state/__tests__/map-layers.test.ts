import { AREA_LAYERS } from '@/constants/hazard-map';
import {
  AREA_KEYS,
  FILL_KEYS,
  fillTileLayer,
  INITIAL_MAP_LAYERS,
  mapLayersReducer,
  overlayCount,
  PIN_KEYS,
  type MapLayerState,
} from '@/state/map-layers';

describe('地図レイヤーの状態', () => {
  it('既定はピンが表示、塗りと区域と人口が非表示', () => {
    expect(INITIAL_MAP_LAYERS).toEqual({
      pins: { shelters: true, carShelters: true, water: true, damage: true, traffic: true },
      fill: 'none',
      areas: { landslide: false, houseCollapse: false },
      population: false,
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
    const quake = mapLayersReducer(flood, { type: 'setFill', fill: 'quake' });
    expect(quake.fill).toBe('quake');
    expect(mapLayersReducer(quake, { type: 'setFill', fill: 'none' }).fill).toBe('none');
  });

  it('塗りの一覧は なし、洪水、地震、地形 の順(選択シートの並び)。人口は塗りに含めない', () => {
    expect([...FILL_KEYS]).toEqual(['none', 'flood', 'quake', 'landform']);
  });

  it('タイルで描く塗りは洪水と地形分類で、なしと地震(同梱データの面)は null', () => {
    expect(fillTileLayer('flood')?.key).toBe('flood');
    expect(fillTileLayer('landform')?.key).toBe('landform');
    expect(fillTileLayer('none')).toBeNull();
    expect(fillTileLayer('quake')).toBeNull();
  });

  it('地形分類も人口と同時に出さない(図郭の内側は不透明で、人口の青が半分の濃さになる)', () => {
    let state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'togglePopulation' });
    state = mapLayersReducer(state, { type: 'setFill', fill: 'landform' });
    expect(state).toMatchObject({ fill: 'landform', population: false });
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(state).toMatchObject({ fill: 'none', population: true });
  });

  it('人口は洪水の塗りと重ねられる(浸水域に何人住むかを読むため)', () => {
    let state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'flood' });
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(state.population).toBe(true);
    expect(state.fill).toBe('flood');
    state = mapLayersReducer(state, { type: 'setFill', fill: 'none' });
    expect(state.population).toBe(true);
    expect(mapLayersReducer(state, { type: 'togglePopulation' }).population).toBe(false);
  });

  it('人口と地震のリスクは同時に出さない(半透明の面どうしで、重ねると両方読めない)', () => {
    let state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'togglePopulation' });
    state = mapLayersReducer(state, { type: 'setFill', fill: 'quake' });
    expect(state).toMatchObject({ fill: 'quake', population: false });
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(state).toMatchObject({ fill: 'none', population: true });
    // 区域タイルは人口とも地震とも重ねられるので影響を受けない
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    state = mapLayersReducer(state, { type: 'setFill', fill: 'quake' });
    expect(state.areas.landslide).toBe(true);
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
      population: false,
    });
    // 塗りを選んでも区域とピンはそのまま残る
    state = mapLayersReducer(state, { type: 'setFill', fill: 'quake' });
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

  it('地震を見ている最中の遷移でも塗りは洪水に置き換わり、人口を見ていればそのまま', () => {
    const quake = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'quake' });
    expect(mapLayersReducer(quake, { type: 'applyDeepLink', link: 'hazard' }).fill).toBe('flood');
    const population = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'togglePopulation' });
    const linked = mapLayersReducer(population, { type: 'applyDeepLink', link: 'hazard' });
    expect(linked).toMatchObject({ fill: 'flood', population: true });
  });

  it('バッジの数は塗り(最大1)、区域、人口の数で、ピンは数えない', () => {
    expect(overlayCount(INITIAL_MAP_LAYERS)).toBe(0);
    let state = mapLayersReducer(INITIAL_MAP_LAYERS, { type: 'setFill', fill: 'flood' });
    expect(overlayCount(state)).toBe(1);
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'landslide' });
    state = mapLayersReducer(state, { type: 'toggleArea', key: 'houseCollapse' });
    expect(overlayCount(state)).toBe(3);
    state = mapLayersReducer(state, { type: 'togglePopulation' });
    expect(overlayCount(state)).toBe(4);
    state = mapLayersReducer(state, { type: 'togglePin', key: 'shelters' });
    expect(overlayCount(state)).toBe(4);
  });
});
