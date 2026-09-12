/**
 * 重ねるハザードマップ(国土交通省)の洪水浸水想定区域(想定最大規模)タイル。
 * 仕様: https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 * 出典表記はポータルサイトへの言及が利用条件。
 */
export const FLOOD_TILE_URL_TEMPLATE =
  'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png';

/** ズーム範囲・透過度はハザードマップポータルの全レイヤーで共通に使う */
export const HAZARD_TILE_MIN_Z = 2;
export const HAZARD_TILE_MAX_Z = 17;

/** ポータルサイトの表示と同程度の透け具合。背景の地名が読める濃さにする */
export const HAZARD_TILE_OPACITY = 0.7;

export const FLOOD_ATTRIBUTION = '出典: ハザードマップポータルサイト(国土交通省)';

/**
 * 浸水深ランクの凡例。水防法準拠の6段階。
 * 色コードは直方市周辺の実タイルから抽出して照合済み(2026-07-14)
 */
export const FLOOD_LEGEND = [
  { color: '#F7F5A9', label: '0.5m未満' },
  { color: '#FFD8C0', label: '0.5〜3m' },
  { color: '#FFB7B7', label: '3〜5m' },
  { color: '#FF9191', label: '5〜10m' },
  { color: '#F285C9', label: '10〜20m' },
  { color: '#DC7ADC', label: '20m〜' },
] as const;

export type HazardLegendEntry = { color: string; label: string };

export type HazardLayerKey = 'flood' | 'debrisFlow' | 'steepSlope' | 'houseCollapse';

export type HazardLayer = {
  key: HazardLayerKey;
  /** 凡例ストリップで色見本の前に置く短い名前(正式名称は長すぎて1行に収まらない) */
  label: string;
  /**
   * やさしい日本語モード用の短い名前。防災用語の意味を保つため
   * 語は変えず読みだけ添える。凡例の見出し(title)は法令上の正式名称なので変えない
   */
  labelEasy: string;
  /** 凡例の見出し(正式名称) */
  title: string;
  urlTemplate: string;
  legend: readonly HazardLegendEntry[];
};

/**
 * 地図に重ねられるハザードレイヤー。市の Web 版ハザードマップと同じ構成
 * (洪水・土石流・急傾斜地・家屋倒壊)。地すべり警戒区域は直方市周辺に
 * タイルが存在しない(市の指定なし)ため載せない。
 * 凡例色はいずれも直方市周辺の実タイルから抽出(2026-07-15)。
 */
export const HAZARD_LAYERS: readonly HazardLayer[] = [
  {
    key: 'flood',
    label: '洪水',
    labelEasy: '洪水(こうずい)',
    title: '洪水浸水想定(想定最大)',
    urlTemplate: FLOOD_TILE_URL_TEMPLATE,
    legend: FLOOD_LEGEND,
  },
  {
    key: 'debrisFlow',
    label: '土石流',
    labelEasy: '土石流(どせきりゅう)',
    title: '土砂災害警戒区域(土石流)',
    urlTemplate: 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png',
    legend: [
      { color: '#E6C832', label: '警戒区域' },
      { color: '#A50021', label: '特別警戒区域' },
    ],
  },
  {
    key: 'steepSlope',
    label: '急傾斜地',
    labelEasy: '急傾斜地(きゅうけいしゃち)',
    title: '土砂災害警戒区域(急傾斜地)',
    urlTemplate: 'https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png',
    legend: [
      { color: '#FAE600', label: '警戒区域' },
      { color: '#FA2800', label: '特別警戒区域' },
    ],
  },
  {
    key: 'houseCollapse',
    label: '家屋倒壊',
    labelEasy: '家屋倒壊(かおくとうかい)',
    title: '家屋倒壊等氾濫想定区域(氾濫流)',
    urlTemplate:
      'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_kaokutoukai_hanran_data/{z}/{x}/{y}.png',
    legend: [{ color: '#FF0000', label: '区域内' }],
  },
];

/**
 * 「重ねる区域」の切替1つが出すタイルの組(2026-09-12 決定)。
 * 土石流と急傾斜地は市の Web 版では別の図だが、どちらも土砂災害警戒区域で
 * 色の意味(警戒、特別警戒)が同じなので、切替と凡例だけを1つにまとめる。
 * タイルの定義(HAZARD_LAYERS)は市の Web 版と同じ2件のまま残す
 */
export const AREA_LAYERS = {
  landslide: ['debrisFlow', 'steepSlope'],
  houseCollapse: ['houseCollapse'],
} as const satisfies Record<string, readonly HazardLayerKey[]>;

export type AreaLayerKey = keyof typeof AREA_LAYERS;

export function hazardLayer(key: HazardLayerKey): HazardLayer {
  const layer = HAZARD_LAYERS.find((l) => l.key === key);
  if (!layer) throw new Error(`ハザードレイヤー ${key} が定義にありません`);
  return layer;
}
