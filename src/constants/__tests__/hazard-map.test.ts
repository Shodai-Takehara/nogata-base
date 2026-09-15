import {
  AREA_LAYERS,
  FLOOD_ATTRIBUTION,
  FLOOD_LEGEND,
  FLOOD_TILE_URL_TEMPLATE,
  HAZARD_LAYERS,
  hazardLayer,
  HAZARD_TILE_MAX_Z,
  HAZARD_TILE_MIN_Z,
  HAZARD_TILE_OPACITY,
  LANDFORM_ATTRIBUTION,
  LANDFORM_LEGEND,
  LANDFORM_TILE_OPACITY,
  tileOptions,
} from '@/constants/hazard-map';
import { FILL_KEYS } from '@/state/map-layers';

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
      [
        'houseCollapseErosion',
        'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_kaokutoukai_kagan_data/{z}/{x}/{y}.png',
      ],
      ['landform', 'https://cyberjapandata.gsi.go.jp/xyz/lcmfc2/{z}/{x}/{y}.png'],
    ]);
  });

  it('全レイヤーが出典を持ち、ポータルのタイルは同じ出典、地形分類は国土地理院', () => {
    for (const layer of HAZARD_LAYERS) {
      expect(layer.attribution).toBe(
        layer.key === 'landform' ? LANDFORM_ATTRIBUTION : FLOOD_ATTRIBUTION,
      );
    }
    expect(LANDFORM_ATTRIBUTION).toContain('国土地理院');
  });

  it('タイルの設定はレイヤーの値を優先し、省略した項目はポータルの共通値で埋める', () => {
    expect(tileOptions(hazardLayer('flood'))).toEqual({
      urlTemplate: FLOOD_TILE_URL_TEMPLATE,
      minimumZ: HAZARD_TILE_MIN_Z,
      maximumNativeZ: HAZARD_TILE_MAX_Z,
      opacity: HAZARD_TILE_OPACITY,
    });
    // 地理院タイル一覧の配信ズーム 11〜16。16 より拡大したときは 16 のタイルを拡大して描く
    expect(tileOptions(hazardLayer('landform'))).toMatchObject({
      minimumZ: 11,
      maximumNativeZ: 16,
      opacity: LANDFORM_TILE_OPACITY,
    });
    expect(LANDFORM_TILE_OPACITY).toBeLessThan(HAZARD_TILE_OPACITY);
  });

  it('上限ズームは maximumZ として渡さない(渡すとそれより拡大したとき塗りが消える)', () => {
    for (const layer of HAZARD_LAYERS) expect(tileOptions(layer)).not.toHaveProperty('maximumZ');
  });

  it('地形分類の凡例は市域に現れる9区分で、縞の区分は縞の色を持つ', () => {
    expect(LANDFORM_LEGEND.map((e) => e.label)).toEqual([
      '山地',
      '段丘面',
      '氾濫平野',
      '後背湿地',
      '微高地(自然堤防)',
      '旧河道',
      '盛土地・埋立地',
      '切土地',
      '現河道・水面',
    ]);
    const striped = LANDFORM_LEGEND.filter((e) => e.stripe).map((e) => e.label);
    expect(striped).toEqual(['旧河道', '盛土地・埋立地']);
    for (const { stripe } of LANDFORM_LEGEND) {
      if (stripe) expect(stripe).toMatch(/^#[0-9A-F]{6}$/);
    }
    const colors = LANDFORM_LEGEND.map((e) => e.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('地形分類の各区分は一言を持ち、水が溜まりやすい区分はそう読める(名前だけでは分からない)', () => {
    for (const { note } of LANDFORM_LEGEND) {
      expect(note?.standard.length).toBeGreaterThan(0);
      expect(note?.easy.length).toBeGreaterThan(0);
      expect(note?.easy).not.toBe(note?.standard);
    }
    const noteOf = (label: string) => LANDFORM_LEGEND.find((e) => e.label === label)?.note;
    for (const label of ['後背湿地', '旧河道']) {
      expect(noteOf(label)?.standard).toContain('浸水しやすく');
      expect(noteOf(label)?.easy).toContain('水(みず)が つきやすく');
    }
    expect(noteOf('氾濫平野')?.standard).toContain('内水氾濫');
  });

  it('各レイヤーの凡例は色・ラベルがそろっている(縞の色も同じ形式)', () => {
    for (const layer of HAZARD_LAYERS) {
      expect(layer.legend.length).toBeGreaterThan(0);
      for (const { color, stripe, label } of layer.legend) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
        if (stripe != null) expect(stripe).toMatch(/^#[0-9A-F]{6}$/);
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

  it('区域の切替は定義済みのタイルだけを指し、塗り(洪水、地形分類)は含まない', () => {
    const keys = HAZARD_LAYERS.map((l) => l.key);
    const fills: readonly string[] = FILL_KEYS;
    for (const tiles of Object.values(AREA_LAYERS)) {
      for (const key of tiles) {
        expect(keys).toContain(key);
        // 塗りと区域の両方に入れると同じタイルが二重に描かれ、透過度が重なって濃く見える
        expect(fills).not.toContain(key);
      }
    }
  });

  it('土砂災害の区域は土石流と急傾斜地、家屋倒壊は氾濫流と河岸侵食の2タイルずつを出す', () => {
    expect(AREA_LAYERS.landslide).toEqual(['debrisFlow', 'steepSlope']);
    expect(AREA_LAYERS.houseCollapse).toEqual(['houseCollapse', 'houseCollapseErosion']);
  });

  it('家屋倒壊の2タイルは区域名が同じで、区分名(氾濫流、河岸侵食)で見分ける', () => {
    const [flow, erosion] = AREA_LAYERS.houseCollapse.map(hazardLayer);
    expect(flow.title).toBe(erosion.title);
    expect(flow.legend.map((e) => e.label)).toEqual(['氾濫流']);
    expect(erosion.legend.map((e) => e.label)).toEqual(['河岸侵食']);
  });

  it('キーからレイヤー定義を引ける', () => {
    expect(hazardLayer('flood').urlTemplate).toBe(FLOOD_TILE_URL_TEMPLATE);
  });
});
