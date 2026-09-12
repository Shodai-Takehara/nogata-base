import type { LatLng } from 'react-native-maps';

import type { MeshSize } from '@/utils/mesh-code';

import quakeMesh from './quake-mesh.json';

/**
 * 地震ハザードレイヤー(F-15)のメッシュデータと塗り分け。
 * データは J-SHIS(防災科学技術研究所)の確率論的地震動予測地図(2024年版)と表層地盤を
 * scripts/quake-hazard.py で直方市域の 250m メッシュぶんに切り出したもの。
 * 年版更新のデータなので API は持たず、バンドルして機内モードでも表示できるようにする。
 */
export type QuakeCell = {
  /** 今後30年間に震度5強以上の揺れに見舞われる確率(0〜1) */
  p50: number | null;
  /** 同 震度6弱以上。塗り分けと凡例の基準 */
  p55: number;
  /** 同 震度6強以上 */
  p60: number | null;
  /** 30年超過確率3%の計測震度 */
  si: number | null;
  /** 表層地盤の増幅率 */
  arv: number | null;
  /** 微地形区分のコードと名称 */
  jcode: number | null;
  jname: string;
};

type QuakeMeshJson = {
  /** fetchedAt は API から値を取った日(キャッシュから再生成しても変わらない) */
  meta: { version: string; fetchedAt: string; cells: number; mesh: MeshSize };
  cells: Record<string, QuakeCell>;
  /** リングは [lng, lat] の並び(GeoJSON と同じ)。holes は別の区分に囲まれた部分 */
  classes: { bucket: number; polys: { outer: number[][]; holes: number[][][] }[] }[];
};

// JSON の mesh は number として推論されるため、250 か 500 に絞る
const data = quakeMesh as QuakeMeshJson;

export const QUAKE_META = data.meta;

/** メッシュコード(QUAKE_META.mesh が 250 なら10桁、500 なら9桁)から値を引く辞書。形状は持たない */
export const QUAKE_CELLS: Readonly<Record<string, QuakeCell>> = data.cells;

export type QuakePolygon = {
  outer: LatLng[];
  /**
   * 別の区分に囲まれた部分(低地の中の台地など)。Polygon の holes に渡す。
   * 穴を空けずに描くと、内側の区分の塗りと重なって濃く見える
   */
  holes: LatLng[][];
};

export type QuakeClass = {
  /** QUAKE_BUCKETS の添字 */
  bucket: number;
  /** 区分ごとに融合した多角形(市境で切ったので複数に分かれる) */
  polys: QuakePolygon[];
};

function toLatLngs(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * 塗るための面。セル約1,000枚を個別に描かず、区分ごとに融合した多角形(最大5件)にして
 * 地図の面オーバーレイの数を抑える。値はセル単位で QUAKE_CELLS に残している
 */
export const QUAKE_CLASSES: readonly QuakeClass[] = data.classes.map((c) => ({
  bucket: c.bucket,
  polys: c.polys.map((p) => ({ outer: toLatLngs(p.outer), holes: p.holes.map(toLatLngs) })),
}));

/**
 * 塗りの段階。地震本部の全国地震動予測地図と同じ5段階(今後30年間に震度6弱以上の確率)。
 * 色は赤茶の1色相の濃淡にする。川藍(人口)、洪水タイルの黄からピンク、土砂タイルの黄と赤、
 * デモの紫のどれとも離れた色相で、状態色(緑/橙/赤)も使わない。
 * 実機で洪水タイルと重ねて判読できることを確かめてから確定する(候補値)
 */
export const QUAKE_BUCKETS = [
  { min: 0, label: '0.1%未満', fill: 'rgba(154,75,47,0.10)' },
  { min: 0.001, label: '0.1〜3%', fill: 'rgba(154,75,47,0.22)' },
  { min: 0.03, label: '3〜6%', fill: 'rgba(154,75,47,0.36)' },
  { min: 0.06, label: '6〜26%', fill: 'rgba(154,75,47,0.52)' },
  { min: 0.26, label: '26%以上', fill: 'rgba(154,75,47,0.68)' },
] as const;

/** 確率(0〜1)が入る区分の添字 */
export function quakeBucket(p55: number): number {
  let index = 0;
  for (let i = 1; i < QUAKE_BUCKETS.length; i += 1) {
    if (p55 >= QUAKE_BUCKETS[i].min) index = i;
  }
  return index;
}

/** 融合面の縁。区分の境界が見える程度にとどめる */
export const QUAKE_STROKE = 'rgba(154,75,47,0.35)';

/**
 * 選択したセル(コードから復元した矩形)の枠。塗りの濃さは確率の符号として使っているため
 * 選択で変えず、枠線だけで選択を示す
 */
export const QUAKE_SELECTED_STROKE = 'rgba(92,40,20,1)';
export const QUAKE_SELECTED_STROKE_WIDTH = 2.5;

export const QUAKE_ATTRIBUTION =
  '出典: J-SHIS 地震ハザードステーション(防災科学技術研究所)2024年基準 NIED作成版を加工して作成';

/**
 * 福智山断層帯。J-SHIS の断層モデル(F012101)の矩形の上端で、地表のずれの位置ではない。
 * 規模と確率は地震調査研究推進本部の長期評価による
 */
export const FUKUCHIYAMA_FAULT = {
  name: '福智山断層帯',
  /** 断層モデルの上端2点(深さ 3km) */
  top: [
    { latitude: 33.936, longitude: 130.726 },
    { latitude: 33.65734, longitude: 130.81558 },
  ] as readonly LatLng[],
  depthKm: 3,
  magnitude: 'M7.2程度',
  probability: '30年以内 ほぼ0〜3%',
  attribution: '出典: 地震調査研究推進本部 長期評価',
} as const;

/**
 * 微地形区分の名称に添える読み(やさしい日本語モード用)。名称は J-SHIS の原文のまま出し、
 * 語を変えない(F-13)。市域に現れる区分だけを持ち、無い名称は読みなしで出す
 */
export const JNAME_READING: Readonly<Record<string, string>> = {
  山地: 'さんち',
  丘陵: 'きゅうりょう',
  砂礫質台地: 'されきしつ だいち',
  谷底低地: 'たにそこ ていち',
  自然堤防: 'しぜん ていぼう',
  後背湿地: 'こうはい しっち',
  '旧河道・旧池沼': 'きゅうかどう・きゅうちしょう',
  河原: 'かわら',
};
