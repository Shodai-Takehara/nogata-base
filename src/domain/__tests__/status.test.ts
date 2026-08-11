import type { Shelter } from '@/domain/models';
import { filterSheltersByHazards, trafficSeverity, waterStatus } from '@/domain/status';

describe('trafficSeverity', () => {
  it('実データの全角括弧表記を判定できる', () => {
    expect(trafficSeverity('通行止め（全面）')).toBe('full');
    expect(trafficSeverity('通行止め（一部）')).toBe('partial');
  });

  it('半角括弧などの表記ゆれでも判定できる', () => {
    expect(trafficSeverity('通行止め(全面)')).toBe('full');
    expect(trafficSeverity('一部通行止め')).toBe('partial');
  });

  it('読み取れない表記は unknown(表示側で危険色に倒す)', () => {
    expect(trafficSeverity('通行止め')).toBe('unknown');
    expect(trafficSeverity('')).toBe('unknown');
  });
});

describe('waterStatus', () => {
  it('警戒水位以上は危険', () => {
    expect(waterStatus(130, 130)).toBe('danger');
    expect(waterStatus(200, 130)).toBe('danger');
  });

  it('警戒水位の7割以上は注意', () => {
    expect(waterStatus(91, 130)).toBe('caution');
  });

  it('7割未満は平常', () => {
    expect(waterStatus(74, 130)).toBe('normal');
    expect(waterStatus(0, 5)).toBe('normal');
  });

  it('欠損値・警戒水位ゼロは不明として扱う', () => {
    expect(waterStatus(null, 130)).toBe('unknown');
    expect(waterStatus(74, null)).toBe('unknown');
    expect(waterStatus(74, 0)).toBe('unknown');
  });

  it('NaN・Infinity は不明として扱う', () => {
    expect(waterStatus(NaN, 130)).toBe('unknown');
    expect(waterStatus(74, NaN)).toBe('unknown');
    expect(waterStatus(Infinity, 130)).toBe('unknown');
  });
});

describe('filterSheltersByHazards', () => {
  const shelter = (
    id: number,
    flood: boolean,
    landslide: boolean,
    earthquake: boolean,
    other: boolean,
  ) => ({ id, hazards: { flood, landslide, earthquake, other } }) as Shelter;

  const shelters = [
    shelter(1, true, false, true, false), //  水害・地震
    shelter(2, true, true, true, true), //    全対応
    shelter(3, false, true, false, true), //  土砂・その他
  ];

  it('選択なしは全件を返す', () => {
    expect(filterSheltersByHazards(shelters, [])).toHaveLength(3);
  });

  it('選択した種別に対応する避難所だけを残す', () => {
    expect(filterSheltersByHazards(shelters, ['flood']).map((s) => s.id)).toEqual([1, 2]);
    expect(filterSheltersByHazards(shelters, ['landslide']).map((s) => s.id)).toEqual([2, 3]);
    expect(filterSheltersByHazards(shelters, ['other']).map((s) => s.id)).toEqual([2, 3]);
  });

  it('複数選択は全条件を満たす避難所だけ(AND)', () => {
    expect(filterSheltersByHazards(shelters, ['flood', 'earthquake']).map((s) => s.id)).toEqual([
      1, 2,
    ]);
    // 水害と土砂の両方に対応するのは全対応の2のみ
    expect(filterSheltersByHazards(shelters, ['flood', 'landslide']).map((s) => s.id)).toEqual([2]);
  });
});
