import { meshBounds, meshCode250, meshCodeAt, meshPolygon } from '@/utils/mesh-code';

/**
 * 市内7地点。コードは J-SHIS の API が 2026-09-12 に返した値。
 * 植木の地点は市境の 400m ほど外だが、コードの計算には関係ない
 */
const KNOWN: [string, number, number, string][] = [
  ['市中心', 33.74, 130.73, '5030458834'],
  ['直方駅', 33.7437, 130.7285, '5030459812'],
  ['感田', 33.766, 130.72, '5030551743'],
  ['植木', 33.785, 130.719, '5030554721'],
  ['頓野', 33.74, 130.77, '5030468143'],
  ['福智山麓', 33.75, 130.8, '5030560411'],
  ['下境', 33.715, 130.735, '5030455844'],
];

describe('250m メッシュコード', () => {
  it.each(KNOWN)('%s の座標から J-SHIS と同じコードを求める', (_name, lat, lng, code) => {
    expect(meshCode250(lat, lng)).toBe(code);
    expect(meshCodeAt(lat, lng, 250)).toBe(code);
  });

  it.each(KNOWN)('%s のコードから復元した矩形が元の座標を含む', (_name, lat, lng, code) => {
    const { southWest, northEast } = meshBounds(code);
    expect(southWest.latitude).toBeLessThanOrEqual(lat);
    expect(northEast.latitude).toBeGreaterThan(lat);
    expect(southWest.longitude).toBeLessThanOrEqual(lng);
    expect(northEast.longitude).toBeGreaterThan(lng);
  });

  it('矩形の大きさは緯度 1/480°、経度 1/320°(J-SHIS が返す多角形と同じ)', () => {
    const { southWest, northEast } = meshBounds('5030458834');
    expect(northEast.latitude - southWest.latitude).toBeCloseTo(1 / 480, 9);
    expect(northEast.longitude - southWest.longitude).toBeCloseTo(1 / 320, 9);
    // J-SHIS の応答(2026-09-12): [130.72813, 33.73958] – [130.73125, 33.74167]
    expect(southWest.longitude).toBeCloseTo(130.72813, 4);
    expect(southWest.latitude).toBeCloseTo(33.73958, 4);
  });

  it('矩形の隅の座標からコードを取ると同じコードに戻る(境界の丸めで隣にずれない)', () => {
    for (const [, , , code] of KNOWN) {
      const { southWest } = meshBounds(code);
      expect(meshCode250(southWest.latitude + 1e-9, southWest.longitude + 1e-9)).toBe(code);
    }
  });

  it('多角形は4隅を時計回りに返す', () => {
    const ring = meshPolygon('5030458834');
    expect(ring).toHaveLength(4);
    expect(ring[0].latitude).toBeLessThan(ring[1].latitude);
    expect(ring[1].longitude).toBeLessThan(ring[2].longitude);
    expect(ring[2].latitude).toBeGreaterThan(ring[3].latitude);
  });

  it('桁数が合っていても、2次メッシュや区画番号の範囲外は受け付けない', () => {
    expect(() => meshBounds('50304588')).toThrow();
    // 区画番号 0 は存在しない
    expect(() => meshBounds('5030458800')).toThrow();
    // 2次メッシュは 0〜7
    expect(() => meshBounds('5030858834')).toThrow();
  });
});

describe('500m メッシュコード(--mesh 500 で集約したとき)', () => {
  it('コードは 250m の上9桁で、矩形は 250m の4枚ぶん', () => {
    expect(meshCodeAt(33.74, 130.73, 500)).toBe('503045883');
    const { southWest, northEast } = meshBounds('503045883');
    expect(northEast.latitude - southWest.latitude).toBeCloseTo(1 / 240, 9);
    expect(northEast.longitude - southWest.longitude).toBeCloseTo(1 / 160, 9);
    // 北東の 250m 区画(…4)は 500m の矩形の中に収まる
    const quarter = meshBounds('5030458834');
    expect(quarter.southWest.latitude).toBeGreaterThanOrEqual(southWest.latitude);
    expect(quarter.northEast.latitude).toBeLessThanOrEqual(northEast.latitude + 1e-12);
    expect(quarter.southWest.longitude).toBeGreaterThanOrEqual(southWest.longitude);
    expect(quarter.northEast.longitude).toBeLessThanOrEqual(northEast.longitude + 1e-12);
  });
});
