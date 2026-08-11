import { FLOOD_LEGEND, FLOOD_TILE_URL_TEMPLATE } from '@/constants/hazard-map';
import { DEPTH_MAX_M } from '@/features/ar/water-plane';
import { decodePng } from '@/features/hazard/png';
import { latLngToTilePixel } from '@/features/hazard/tile-math';

export type FloodDepthRank = {
  /** 凡例と同じ表現(例: 「3〜5m」) */
  label: string;
  /** AR の水面初期値。想定最大規模の体感なのでランク上限側、ただしスライダー可動域に収める */
  arDepthM: number;
};

/**
 * 凡例ランクごとの AR 初期値。ランクの上限値をスライダー上限(5.0m)でクランプした値。
 * FLOOD_LEGEND と同順で対応する
 */
const AR_DEPTH_BY_RANK: readonly number[] = [0.5, 3.0, 5.0, DEPTH_MAX_M, DEPTH_MAX_M, DEPTH_MAX_M];

/** アンチエイリアス等での色ずれ許容量(RGB 距離の2乗)。凡例色同士の最短距離より十分小さい値 */
const COLOR_TOLERANCE_SQ = 30 * 30;

/** タイル色を凡例ランクへ変換する。どの凡例色にも近くなければ「想定なし」として null */
export function floodRankFromColor(
  r: number,
  g: number,
  b: number,
  a: number,
): FloodDepthRank | null {
  // 透明ピクセル=浸水想定区域の外
  if (a < 128) return null;
  let best: { index: number; distSq: number } | null = null;
  FLOOD_LEGEND.forEach((item, index) => {
    const cr = parseInt(item.color.slice(1, 3), 16);
    const cg = parseInt(item.color.slice(3, 5), 16);
    const cb = parseInt(item.color.slice(5, 7), 16);
    const distSq = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (best == null || distSq < best.distSq) {
      best = { index, distSq };
    }
  });
  if (best == null) return null;
  const { index, distSq } = best as { index: number; distSq: number };
  if (distSq > COLOR_TOLERANCE_SQ) return null;
  return { label: FLOOD_LEGEND[index].label, arDepthM: AR_DEPTH_BY_RANK[index] };
}

/** 1px≒1.2m の分解能。GPS 精度(数m)と釣り合う最詳細ズーム */
const LOOKUP_ZOOM = 17;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * 現在地の想定浸水深(想定最大規模)をハザードタイルの色から読み取る。
 * 判定できない場合(圏外・データ未整備・通信失敗)は null を返し、呼び出し側は既定値で動く。
 */
export async function fetchFloodDepthAt(lat: number, lng: number): Promise<FloodDepthRank | null> {
  const { tileX, tileY, pixelX, pixelY } = latLngToTilePixel(lat, lng, LOOKUP_ZOOM);
  const url = FLOOD_TILE_URL_TEMPLATE.replace('{z}', String(LOOKUP_ZOOM))
    .replace('{x}', String(tileX))
    .replace('{y}', String(tileY));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // 404 は「その区画に浸水想定がない」ことを意味する(タイル未生成)
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const png = decodePng(bytes);
    const [r, g, b, a] = png.rgbaAt(pixelX, pixelY);
    return floodRankFromColor(r, g, b, a);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
