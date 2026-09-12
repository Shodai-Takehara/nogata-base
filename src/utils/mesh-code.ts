import type { LatLng } from 'react-native-maps';

/**
 * 地域メッシュ(JIS X 0410)。3次メッシュ(1/120°×1/80°)を 2×2 に分けた 500m メッシュ(9桁)と、
 * さらに 2×2 に分けた 250m メッシュ(10桁)を扱う。
 * J-SHIS の地震ハザードは 250m メッシュ単位で、コードで値を引く。
 * 生成スクリプトが `--mesh 500` で集約したときは9桁で引く
 */
export type MeshSize = 250 | 500;

const STEP: Record<MeshSize, { lat: number; lng: number }> = {
  500: { lat: 1 / 240, lng: 1 / 160 },
  250: { lat: 1 / 480, lng: 1 / 320 },
};

/** 4分割の区画番号。南西=1、南東=2、北西=3、北東=4 */
function quadrant(latFraction: number, lngFraction: number): number {
  return (latFraction < 0.5 ? 1 : 3) + (lngFraction < 0.5 ? 0 : 1);
}

/**
 * 座標を含む 250m メッシュのコード(10桁)。
 * scripts/quake-hazard.py の mesh_code_250 と同じ計算で、生成した辞書のキーと一致する
 */
export function meshCode250(lat: number, lng: number): string {
  const p = Math.floor(lat * 1.5);
  const u = Math.floor(lng - 100);
  let a = lat * 1.5 - p;
  let b = lng - 100 - u;
  const q = Math.floor(a * 8);
  const v = Math.floor(b * 8);
  a = a * 8 - q;
  b = b * 8 - v;
  const r = Math.floor(a * 10);
  const w = Math.floor(b * 10);
  a = a * 10 - r;
  b = b * 10 - w;
  const half = quadrant(a, b);
  a = (a * 2) % 1;
  b = (b * 2) % 1;
  const quarter = quadrant(a, b);
  return `${String(p).padStart(2, '0')}${String(u).padStart(2, '0')}${q}${v}${r}${w}${half}${quarter}`;
}

/** 座標を含むメッシュのコード。500m メッシュのコードは 250m のコードの上9桁 */
export function meshCodeAt(lat: number, lng: number, size: MeshSize): string {
  const code = meshCode250(lat, lng);
  return size === 500 ? code.slice(0, 9) : code;
}

/** 区画番号から南西隅のずれ(区画の辺を1とする) */
function quadrantOffset(digit: number): { lat: number; lng: number } {
  return { lat: digit >= 3 ? 0.5 : 0, lng: digit % 2 === 0 ? 0.5 : 0 };
}

/**
 * 500m か 250m メッシュのコードから矩形(南西隅と北東隅)を復元する。
 * 選択したセルの枠を描くのに使う。形状を JSON に持たせないためのもの
 */
export function meshBounds(code: string): { southWest: LatLng; northEast: LatLng } {
  // 2次メッシュは 0〜7、区画番号は 1〜4 しか取らない。桁数だけの検査だと
  // 壊れたキーから、それらしいが違う場所の矩形ができてしまう
  if (!/^\d{4}[0-7]{2}\d{2}[1-4][1-4]?$/.test(code)) {
    throw new Error(`500m か 250m のメッシュコードではない: ${code}`);
  }
  const size: MeshSize = code.length === 10 ? 250 : 500;
  const p = Number(code.slice(0, 2));
  const u = Number(code.slice(2, 4));
  const q = Number(code[4]);
  const v = Number(code[5]);
  const r = Number(code[6]);
  const w = Number(code[7]);
  const half = quadrantOffset(Number(code[8]));
  const quarter = size === 250 ? quadrantOffset(Number(code[9])) : { lat: 0, lng: 0 };
  const lat = p / 1.5 + q / 12 + r / 120 + half.lat / 120 + quarter.lat / 240;
  const lng = 100 + u + v / 8 + w / 80 + half.lng / 80 + quarter.lng / 160;
  return {
    southWest: { latitude: lat, longitude: lng },
    northEast: { latitude: lat + STEP[size].lat, longitude: lng + STEP[size].lng },
  };
}

/** 矩形の4隅を時計回りに返す。Polygon の coordinates にそのまま渡す */
export function meshPolygon(code: string): LatLng[] {
  const { southWest, northEast } = meshBounds(code);
  return [
    southWest,
    { latitude: northEast.latitude, longitude: southWest.longitude },
    northEast,
    { latitude: southWest.latitude, longitude: northEast.longitude },
  ];
}
