/**
 * 重ねるハザードマップ(国土交通省)の洪水浸水想定区域(想定最大規模)タイル。
 * 仕様: https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 * 出典表記はポータルサイトへの言及が利用条件。
 */
export const FLOOD_TILE_URL_TEMPLATE =
  'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png';

/** ハザードマップポータルの全タイルで共通の配信ズーム範囲。他の配信元はレイヤー側で上書きする */
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

export type HazardLegendEntry = {
  color: string;
  label: string;
  /** 縞模様で描かれる区分の縞の色。地の色(color)の上に横縞で重ねて見本にする */
  stripe?: string;
};

/**
 * 治水地形分類図(更新版)の地理院タイル。土地の成り立ちから「川と関係なく水が
 * 溜まりやすい土地」を示す。配信範囲は一級水系の氾濫平野とその周辺で、直方市では
 * 福智山側の山地にタイルが無く(404)、図郭の外は白い基図だけが描かれる。
 * 出典表記が利用条件(地理院タイル一覧)。
 * https://maps.gsi.go.jp/development/ichiran.html#lcmfc2
 */
export const LANDFORM_TILE_URL_TEMPLATE =
  'https://cyberjapandata.gsi.go.jp/xyz/lcmfc2/{z}/{x}/{y}.png';

/** 出典カードにも同じ名前で載せるため、「出典: 」を除いた形を分けて持つ */
export const LANDFORM_SOURCE = '国土地理院(治水地形分類図)';
export const LANDFORM_ATTRIBUTION = `出典: ${LANDFORM_SOURCE}`;

/**
 * 治水地形分類図は面をベタ塗りするので、ポータルのタイルと同じ 0.7 では下の地名が
 * 読めない。0.5 は候補で、実機で読めなければ下げる
 */
export const LANDFORM_TILE_OPACITY = 0.5;

/**
 * 公式の凡例は約40項目あるが、直方市域に現れて防災上の意味を持つ区分に絞る。
 * 色はタイルの実画素から抽出(2026-09-13、市域の z16 タイル 481 枚)。公式の凡例画像の色
 * より白寄りなのは、タイルが分類の面を基図の上に透かして描いているため。
 * 切土地は設計時の8分類に無かったが、市域の画素の 6.5% を占め(丘陵の造成地と
 * ゴルフ場)、凡例に無いと灰色の大きな面の意味が分からないため加えた。
 * 旧河道と盛土地は縞模様で描かれるので、地の色と縞の色を分けて持つ
 */
export const LANDFORM_LEGEND: readonly HazardLegendEntry[] = [
  { color: '#FFE3AC', label: '山地' },
  { color: '#FFC85A', label: '段丘面' },
  { color: '#E3FFD5', label: '氾濫平野' },
  { color: '#9CDFC9', label: '後背湿地' },
  { color: '#FFFF5A', label: '微高地(自然堤防)' },
  { color: '#CADDFA', stripe: '#5A96EF', label: '旧河道' },
  { color: '#F5FF4B', stripe: '#F4924B', label: '盛土地・埋立地' },
  { color: '#DED4C1', label: '切土地' },
  { color: '#A5D8F7', label: '現河道・水面' },
];

export type HazardLayerKey = 'flood' | 'debrisFlow' | 'steepSlope' | 'houseCollapse' | 'landform';

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
  attribution: string;
  /** 配信元が持つズーム範囲。省略時はハザードマップポータルの共通値 */
  minZ?: number;
  maxZ?: number;
  /** 省略時はポータルのタイルと同じ透け具合 */
  opacity?: number;
};

/**
 * 地図に重ねられるタイルのレイヤー。市の Web 版ハザードマップと同じ構成
 * (洪水・土石流・急傾斜地・家屋倒壊)に、国土地理院の治水地形分類図を足したもの。
 * 地すべり警戒区域は直方市周辺にタイルが存在しない(市の指定なし)ため載せない。
 * 凡例色はいずれも直方市周辺の実タイルから抽出(ポータル分は 2026-07-15)。
 */
export const HAZARD_LAYERS: readonly HazardLayer[] = [
  {
    key: 'flood',
    label: '洪水',
    labelEasy: '洪水(こうずい)',
    title: '洪水浸水想定(想定最大)',
    urlTemplate: FLOOD_TILE_URL_TEMPLATE,
    legend: FLOOD_LEGEND,
    attribution: FLOOD_ATTRIBUTION,
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
    attribution: FLOOD_ATTRIBUTION,
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
    attribution: FLOOD_ATTRIBUTION,
  },
  {
    key: 'houseCollapse',
    label: '家屋倒壊',
    labelEasy: '家屋倒壊(かおくとうかい)',
    title: '家屋倒壊等氾濫想定区域(氾濫流)',
    urlTemplate:
      'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_kaokutoukai_hanran_data/{z}/{x}/{y}.png',
    legend: [{ color: '#FF0000', label: '区域内' }],
    attribution: FLOOD_ATTRIBUTION,
  },
  {
    key: 'landform',
    label: '地形',
    labelEasy: '地形(ちけい)',
    title: '治水地形分類図',
    urlTemplate: LANDFORM_TILE_URL_TEMPLATE,
    legend: LANDFORM_LEGEND,
    attribution: LANDFORM_ATTRIBUTION,
    minZ: 11,
    maxZ: 16,
    opacity: LANDFORM_TILE_OPACITY,
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

/**
 * 配信の上限ズームは maximumZ ではなく maximumNativeZ で渡す。maximumZ にすると
 * それより拡大したとき(自宅へ移動した直後や街区の拡大)に塗りが消えて、凡例だけが残る。
 * maximumNativeZ なら上限のタイルを切り出して拡大して描く
 */
export function tileOptions(layer: HazardLayer): {
  urlTemplate: string;
  minimumZ: number;
  maximumNativeZ: number;
  opacity: number;
} {
  return {
    urlTemplate: layer.urlTemplate,
    minimumZ: layer.minZ ?? HAZARD_TILE_MIN_Z,
    maximumNativeZ: layer.maxZ ?? HAZARD_TILE_MAX_Z,
    opacity: layer.opacity ?? HAZARD_TILE_OPACITY,
  };
}
