import type { LatLng } from 'react-native-maps';

import {
  FUKUCHIYAMA_FAULT,
  JNAME_READING,
  QUAKE_ATTRIBUTION,
  QUAKE_BUCKETS,
  QUAKE_CELLS,
  QUAKE_CLASSES,
  QUAKE_META,
  quakeBucket,
} from '@/constants/quake-map';
import { meshBounds } from '@/utils/mesh-code';

/**
 * 直方市の行政区域の外接矩形(国土数値情報 N03 2025: 緯度 33.700〜33.796、経度 130.680〜130.806)に、
 * 市境に掛かるメッシュがはみ出すぶん(1枚 = 緯度 1/480°、経度 1/320°)の余裕を持たせたもの
 */
const CITY_BOUNDS = { minLat: 33.697, maxLat: 33.799, minLng: 130.676, maxLng: 130.809 };

describe('地震ハザードのメッシュデータ', () => {
  const codes = Object.keys(QUAKE_CELLS);

  it('市域ぶんのセルがあり、件数とキーの桁数が meta と一致する', () => {
    expect(codes.length).toBe(QUAKE_META.cells);
    expect(QUAKE_META.version).toBe('Y2024');
    // 250m なら約1,000枚(10桁)、--mesh 500 で集約していれば約260枚(9桁)
    const digits = QUAKE_META.mesh === 250 ? 10 : 9;
    expect(codes.length).toBeGreaterThan(QUAKE_META.mesh === 250 ? 900 : 220);
    for (const code of codes) expect(code).toHaveLength(digits);
  });

  it('確率は 0〜1 の範囲で、震度6弱以上 ≦ 震度5強以上 の関係を保つ', () => {
    for (const cell of Object.values(QUAKE_CELLS)) {
      expect(cell.p55).toBeGreaterThanOrEqual(0);
      expect(cell.p55).toBeLessThanOrEqual(1);
      if (cell.p50 != null) expect(cell.p50).toBeGreaterThanOrEqual(cell.p55);
      if (cell.p60 != null) expect(cell.p60).toBeLessThanOrEqual(cell.p55);
      expect(cell.jname.length).toBeGreaterThan(0);
    }
  });

  it('全コードから復元した矩形が市域の外接矩形の中にある', () => {
    for (const code of codes) {
      const { southWest, northEast } = meshBounds(code);
      expect(southWest.latitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLat);
      expect(northEast.latitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLat);
      expect(southWest.longitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLng);
      expect(northEast.longitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLng);
    }
  });

  it('調査した市中心のセル(市役所付近)は自然堤防で、震度6弱以上が 9.5%(API の値のまま)', () => {
    const cell = QUAKE_CELLS['5030458834'];
    expect(cell.jname).toBe('自然堤防');
    // API が 2026-09-12 に返した値。丸めずに持つ(scripts/verify-quake-hazard.py で全セルを照合できる)
    expect(cell.p55).toBe(0.095169);
    expect(cell.p50).toBe(0.389915);
    expect(cell.arv).toBe(1.84);
  });

  it('区分の境界のすぐ下のセルは J-SHIS と同じ下の区分に入る(小数3桁に丸めると1段上がる)', () => {
    // 2.9956% と 5.9988%。API の値そのままで区分するので、J-SHIS の地図と同じ色になる
    expect(QUAKE_CELLS['5030458712'].p55).toBe(0.029956);
    expect(quakeBucket(QUAKE_CELLS['5030458712'].p55)).toBe(1);
    expect(QUAKE_CELLS['5030552813'].p55).toBe(0.059988);
    expect(quakeBucket(QUAKE_CELLS['5030552813'].p55)).toBe(2);
  });

  it('融合面は区分ごとに1件で、外周と穴のリングは3点以上の座標からなり市域内にある', () => {
    const buckets = QUAKE_CLASSES.map((c) => c.bucket);
    expect(new Set(buckets).size).toBe(buckets.length);
    expect(QUAKE_CLASSES.length).toBeGreaterThan(0);
    for (const cls of QUAKE_CLASSES) {
      expect(cls.bucket).toBeGreaterThanOrEqual(0);
      expect(cls.bucket).toBeLessThan(QUAKE_BUCKETS.length);
      expect(cls.polys.length).toBeGreaterThan(0);
      for (const poly of cls.polys) {
        for (const ring of [poly.outer, ...poly.holes]) {
          expect(ring.length).toBeGreaterThanOrEqual(3);
          for (const { latitude, longitude } of ring) {
            expect(latitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLat);
            expect(latitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLat);
            expect(longitude).toBeGreaterThanOrEqual(CITY_BOUNDS.minLng);
            expect(longitude).toBeLessThanOrEqual(CITY_BOUNDS.maxLng);
          }
        }
      }
    }
  });

  it('別の区分に囲まれた部分は穴として持つ(穴を落とすと塗りが重なる)', () => {
    // 250m では低地の中の台地などが 11 か所ある。500m に集約すると消えることがある
    if (QUAKE_META.mesh !== 250) return;
    const holes = QUAKE_CLASSES.flatMap((c) => c.polys.flatMap((p) => p.holes));
    expect(holes.length).toBeGreaterThan(0);
  });

  it('各セルの中心は、そのセルの確率から求めた区分の融合面の中にある(塗りと詳細が食い違わない)', () => {
    let checked = 0;
    for (const code of codes) {
      const { southWest, northEast } = meshBounds(code);
      const center = {
        latitude: (southWest.latitude + northEast.latitude) / 2,
        longitude: (southWest.longitude + northEast.longitude) / 2,
      };
      const cls = QUAKE_CLASSES.find((c) =>
        c.polys.some((p) => contains(p.outer, center) && !p.holes.some((h) => contains(h, center))),
      );
      // 市境のセルは中心が市域の外にあり、切り取った面に入らないことがある
      if (!cls) continue;
      checked += 1;
      expect(cls.bucket).toBe(quakeBucket(QUAKE_CELLS[code].p55));
    }
    expect(checked).toBeGreaterThan(codes.length * 0.85);
  });

  it('区分関数は地震本部の境界値(0.1%、3%、6%、26%)で切り替わる', () => {
    expect(quakeBucket(0)).toBe(0);
    expect(quakeBucket(0.00099)).toBe(0);
    expect(quakeBucket(0.001)).toBe(1);
    expect(quakeBucket(0.0299)).toBe(1);
    expect(quakeBucket(0.03)).toBe(2);
    expect(quakeBucket(0.0599)).toBe(2);
    expect(quakeBucket(0.06)).toBe(3);
    expect(quakeBucket(0.2599)).toBe(3);
    expect(quakeBucket(0.26)).toBe(4);
    expect(quakeBucket(1)).toBe(4);
  });

  it('凡例は5段階で、色が濃くなる順に並ぶ', () => {
    expect(QUAKE_BUCKETS).toHaveLength(5);
    const alphas = QUAKE_BUCKETS.map((b) => Number(b.fill.match(/,([\d.]+)\)$/)?.[1]));
    for (let i = 1; i < alphas.length; i += 1) expect(alphas[i]).toBeGreaterThan(alphas[i - 1]);
  });

  it('市域に現れる微地形区分はすべて読みを持つ(やさしい日本語モード)', () => {
    const names = new Set(Object.values(QUAKE_CELLS).map((c) => c.jname));
    for (const name of names) expect(JNAME_READING[name]).toBeTruthy();
    // 市域に無い区分の読みは持たない(使われない読みを保守しない)
    for (const name of Object.keys(JNAME_READING)) expect(names.has(name)).toBe(true);
  });

  it('断層は上端2点で、出典を持つ', () => {
    expect(FUKUCHIYAMA_FAULT.top).toHaveLength(2);
    expect(FUKUCHIYAMA_FAULT.attribution.length).toBeGreaterThan(0);
    expect(QUAKE_ATTRIBUTION).toContain('J-SHIS');
  });
});

/** 射線法。多角形の辺と交差する回数が奇数なら内側 */
function contains(ring: readonly LatLng[], point: LatLng): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude <
        ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) +
          a.longitude;
    if (crosses) inside = !inside;
  }
  return inside;
}
