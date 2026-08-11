/** XYZ タイルは 256px 四方(重ねるハザードマップの配信仕様) */
export const TILE_SIZE = 256;

export type TilePixel = {
  tileX: number;
  tileY: number;
  /** タイル内のピクセル位置(0..255) */
  pixelX: number;
  pixelY: number;
};

/** Web メルカトルの有効緯度。これを超えるとタイル座標が定義できない */
const MAX_LAT = 85.0511;

/**
 * 緯度経度から、指定ズームのタイル座標とタイル内ピクセル位置を求める(Web メルカトル)。
 * 現在地の想定浸水深をタイルの1ピクセルから読み取るために使う。
 */
export function latLngToTilePixel(lat: number, lng: number, zoom: number): TilePixel {
  const clampedLat = Math.min(Math.max(lat, -MAX_LAT), MAX_LAT);
  const n = 2 ** zoom;

  const xf = ((lng + 180) / 360) * n;
  const latRad = (clampedLat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  // 経度 180 度ちょうど等で端に出た場合もタイル範囲内へ収める
  const tileX = Math.min(Math.max(Math.floor(xf), 0), n - 1);
  const tileY = Math.min(Math.max(Math.floor(yf), 0), n - 1);
  return {
    tileX,
    tileY,
    pixelX: Math.min(Math.floor((xf - tileX) * TILE_SIZE), TILE_SIZE - 1),
    pixelY: Math.min(Math.floor((yf - tileY) * TILE_SIZE), TILE_SIZE - 1),
  };
}
