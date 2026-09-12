import type { LatLng } from 'react-native-maps';

import meshCells from './population-mesh.json';

/**
 * 人口レイヤーのメッシュデータと塗り分け。
 * データは国土数値情報 500mメッシュ別将来推計人口(R6国政局推計)を
 * scripts/flood-population.py で直方市域に切り出したもの(2025年推計・市内ぶんの按分値)。
 * 年次更新のデータなので API は持たず、バンドルして機内モードでも表示できるようにする。
 */
export type PopulationCell = {
  /** 代表の地域名(セルと最も広く重なる町丁字。「◯◯ 付近」として表示する) */
  name: string;
  /** 市内ぶんの推計人口(2025年) */
  pop: number;
  /** うち65歳以上 */
  p65: number;
  /** 描画用の外周リング(市境で切ったメッシュは複数に分かれる) */
  polys: LatLng[][];
};

export const POPULATION_CELLS: readonly PopulationCell[] = (
  meshCells as { name: string; pop: number; p65: number; polys: [number, number][][] }[]
).map((cell) => ({
  name: cell.name,
  pop: cell.pop,
  p65: cell.p65,
  polys: cell.polys.map((ring) => ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))),
}));

/**
 * 塗りの段階。境界値は市内の分布(中央値 159人、最大 1,704人)に合わせた。
 * 色は主色(川藍)の濃淡1色にする。状態色(緑/橙/赤)やハザードタイルの
 * 暖色と別の色相にして、人の多さが危険度に読まれるのを防ぐ
 */
export const POPULATION_BUCKETS = [
  { min: 0, label: '〜99人', fill: 'rgba(30,78,121,0.10)' },
  { min: 100, label: '100〜499人', fill: 'rgba(30,78,121,0.24)' },
  { min: 500, label: '500〜999人', fill: 'rgba(30,78,121,0.40)' },
  { min: 1000, label: '1,000人〜', fill: 'rgba(30,78,121,0.56)' },
] as const;

export function populationFill(pop: number): string {
  let fill: string = POPULATION_BUCKETS[0].fill;
  for (const bucket of POPULATION_BUCKETS) {
    if (pop >= bucket.min) fill = bucket.fill;
  }
  return fill;
}

/** メッシュ同士の境界線。塗りより一段濃くして格子が見える程度にとどめる */
export const POPULATION_STROKE = 'rgba(30,78,121,0.35)';

/**
 * 選択中セルの枠。塗りの濃さは人数の符号として使っているため選択で変えず、
 * 枠線の色と太さだけで選択を示す
 */
export const POPULATION_SELECTED_STROKE = 'rgba(22,50,79,1)';
export const POPULATION_SELECTED_STROKE_WIDTH = 2.5;

export const POPULATION_ATTRIBUTION =
  '出典: 国土数値情報 500mメッシュ別将来推計人口(国土交通省)を加工して作成';

/** 地域名の出典。人数(国土数値情報)と提供元が違うため、シートでは両方を併記する */
export const POPULATION_AREA_ATTRIBUTION =
  '地域名: 国勢調査 小地域境界データ(e-Stat)を加工して作成';
