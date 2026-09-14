import type { LatLng } from '@/domain/models';

const EARTH_RADIUS_M = 6_371_000;

/**
 * 2点間の直線距離(m)をハバサイン法で求める。
 * 距離は端末内で計算する(自宅位置を外部へ送らない)。
 * 市域(数 km 四方)では球面近似で十分な精度になる。
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * 徒歩の分速(m/分)。不動産表示の慣行値で、高齢者や荷物を持った移動より速い。
 * 直線距離をこれで割るので、道なりの所要時間より短く出る。表示側で「約」を付けて目安と示す
 */
const WALK_METERS_PER_MINUTE = 80;

/**
 * 直線距離(m)から徒歩の分数を切り上げで求める。切り捨てだと 79m が 0 分になる。
 * 壊れた距離(非数、負値)は距離の整形と同じく表示側で「—」にするため null を返す
 */
export function walkingMinutes(meters: number): number | null {
  if (!Number.isFinite(meters) || meters < 0) return null;
  return Math.ceil(meters / WALK_METERS_PER_MINUTE);
}

/**
 * 距離の表示用整形。直線距離は目安のため、実際より精密に見せない:
 * 1km 未満は 10m 単位に丸め、950m 以上は km 1桁小数にする
 * (950〜999m を「1000m」と出さないための境界)。
 */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 950) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
