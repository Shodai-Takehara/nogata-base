import { formatDistanceMeters, haversineMeters } from '@/utils/geo';

describe('haversineMeters', () => {
  it('同一地点は 0m', () => {
    const p = { latitude: 33.744, longitude: 130.729 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('緯度 0.01 度の差はおよそ 1.11km(緯度 1 度 ≒ 111.2km)', () => {
    const d = haversineMeters(
      { latitude: 33.74, longitude: 130.73 },
      { latitude: 33.75, longitude: 130.73 },
    );
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });

  it('経度方向は緯度の余弦の分だけ短くなる(北緯 33.74 度で約 0.83 倍)', () => {
    const d = haversineMeters(
      { latitude: 33.74, longitude: 130.73 },
      { latitude: 33.74, longitude: 130.74 },
    );
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(940);
  });

  it('始点と終点を入れ替えても同じ距離', () => {
    const a = { latitude: 33.74, longitude: 130.73 };
    const b = { latitude: 33.76, longitude: 130.75 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a));
  });
});

describe('formatDistanceMeters', () => {
  it('1km 未満は 10m 単位に丸める', () => {
    expect(formatDistanceMeters(0)).toBe('0m');
    expect(formatDistanceMeters(347)).toBe('350m');
    expect(formatDistanceMeters(944)).toBe('940m');
  });

  it('950m 以上は km 1桁小数(950〜999m を 1000m と出さない)', () => {
    expect(formatDistanceMeters(951)).toBe('1.0km');
    expect(formatDistanceMeters(1240)).toBe('1.2km');
    expect(formatDistanceMeters(12345)).toBe('12.3km');
  });

  it('負値・非数は — にする', () => {
    expect(formatDistanceMeters(NaN)).toBe('—');
    expect(formatDistanceMeters(-1)).toBe('—');
    expect(formatDistanceMeters(Infinity)).toBe('—');
  });
});
