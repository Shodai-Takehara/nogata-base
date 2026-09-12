import {
  AREA_LAYERS,
  FLOOD_LEGEND,
  FLOOD_TILE_URL_TEMPLATE,
  HAZARD_LAYERS,
  hazardLayer,
  HAZARD_TILE_MAX_Z,
  HAZARD_TILE_MIN_Z,
  HAZARD_TILE_OPACITY,
} from '@/constants/hazard-map';

describe('ハザードマップタイル定義', () => {
  it('URL が確認済みの配信エンドポイントと一致する(変更時はタイル仕様の再確認が必要)', () => {
    expect(FLOOD_TILE_URL_TEMPLATE).toBe(
      'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',
    );
  });

  it('ズーム範囲と透過度が妥当な範囲にある', () => {
    expect(HAZARD_TILE_MIN_Z).toBeLessThan(HAZARD_TILE_MAX_Z);
    expect(HAZARD_TILE_OPACITY).toBeGreaterThan(0);
    expect(HAZARD_TILE_OPACITY).toBeLessThanOrEqual(1);
  });

  it('レイヤーの URL が確認済みの配信データセットと一致する(変更時はタイル仕様の再確認が必要)', () => {
    // データセット名の打ち間違いは 404 で静かに何も描かれないため、完全一致で固定する
    expect(HAZARD_LAYERS.map((l) => [l.key, l.urlTemplate])).toEqual([
      [
        'flood',
        'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',
      ],
      [
        'debrisFlow',
        'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png',
      ],
      [
        'steepSlope',
        'https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png',
      ],
      [
        'houseCollapse',
        'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_kaokutoukai_hanran_data/{z}/{x}/{y}.png',
      ],
    ]);
  });

  it('各レイヤーの凡例は色・ラベルがそろっている', () => {
    for (const layer of HAZARD_LAYERS) {
      expect(layer.legend.length).toBeGreaterThan(0);
      for (const { color, label } of layer.legend) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('凡例は浅い順に6段階で、色が重複しない', () => {
    expect(FLOOD_LEGEND.map((l) => l.label)).toEqual([
      '0.5m未満',
      '0.5〜3m',
      '3〜5m',
      '5〜10m',
      '10〜20m',
      '20m〜',
    ]);
    const colors = FLOOD_LEGEND.map((l) => l.color);
    expect(new Set(colors).size).toBe(colors.length);
    for (const { color, label } of FLOOD_LEGEND) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('区域の切替は定義済みのタイルだけを指し、洪水(塗り)は含まない', () => {
    const keys = HAZARD_LAYERS.map((l) => l.key);
    for (const tiles of Object.values(AREA_LAYERS)) {
      for (const key of tiles) {
        expect(keys).toContain(key);
        expect(key).not.toBe('flood');
      }
    }
  });

  it('土砂災害の区域は土石流と急傾斜地の2タイルを出す(2026-09-12 の統合)', () => {
    expect(AREA_LAYERS.landslide).toEqual(['debrisFlow', 'steepSlope']);
    expect(AREA_LAYERS.houseCollapse).toEqual(['houseCollapse']);
  });

  it('キーからレイヤー定義を引ける', () => {
    expect(hazardLayer('flood').urlTemplate).toBe(FLOOD_TILE_URL_TEMPLATE);
  });
});
