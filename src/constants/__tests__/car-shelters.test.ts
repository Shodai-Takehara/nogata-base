import { CAR_SHELTERS } from '@/constants/car-shelters';

describe('車中泊避難所の静的データ', () => {
  it('市サイト掲載の9箇所がある', () => {
    expect(CAR_SHELTERS).toHaveLength(9);
  });

  it('id と名称が重複していない', () => {
    expect(new Set(CAR_SHELTERS.map((c) => c.id)).size).toBe(CAR_SHELTERS.length);
    expect(new Set(CAR_SHELTERS.map((c) => c.name)).size).toBe(CAR_SHELTERS.length);
  });

  it('座標が直方市の範囲に収まっている', () => {
    // 手入力の座標なので、桁誤り・緯度経度の取り違えをここで検出する
    for (const c of CAR_SHELTERS) {
      expect(c.coord.latitude).toBeGreaterThan(33.68);
      expect(c.coord.latitude).toBeLessThan(33.82);
      expect(c.coord.longitude).toBeGreaterThan(130.65);
      expect(c.coord.longitude).toBeLessThan(130.82);
    }
  });

  it('住所はすべて直方市内', () => {
    for (const c of CAR_SHELTERS) {
      expect(c.address).toContain('直方市');
    }
  });
});
