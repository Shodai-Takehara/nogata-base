import type { Shelter, ShelterOpening } from '@/domain/models';
import {
  nearestShelterFor,
  nearestSheltersForHome,
  shelterDistances,
  sortSheltersForList,
} from '@/domain/shelter-order';

function shelter(
  id: number,
  name: string,
  opening: ShelterOpening,
  coord: { latitude: number; longitude: number },
  hazards: Partial<Shelter['hazards']> = {},
): Shelter {
  return {
    id,
    name,
    opening,
    coord,
    address: null,
    tel: null,
    families: null,
    refugees: null,
    capacity: null,
    floorAreaM2: null,
    hazards: { flood: false, landslide: false, earthquake: false, other: false, ...hazards },
    evacuees: [],
    updatedAt: null,
  };
}

const home = { latitude: 33.744, longitude: 130.729 };
// 自宅からの距離: 近い < 中間 < 遠い になるよう緯度をずらす
const near = shelter(1, '近い避難所', '0', { latitude: 33.745, longitude: 130.729 });
const mid = shelter(2, '中間の避難所', '3', { latitude: 33.76, longitude: 130.729 });
const far = shelter(3, '遠い避難所', '1', { latitude: 33.8, longitude: 130.729 });

describe('shelterDistances', () => {
  it('自宅未設定は null(距離順にしない)', () => {
    expect(shelterDistances([near, far], null)).toBeNull();
  });

  it('自宅設定時は全避難所の距離を id 引きで返す', () => {
    const distances = shelterDistances([near, far], home);
    expect(distances?.size).toBe(2);
    expect(distances?.get(near.id)).toBeLessThan(distances?.get(far.id) ?? 0);
  });
});

describe('sortSheltersForList', () => {
  it('距離なしは従来順: 開設中が先、混雑の軽い順、同状態は名前順', () => {
    const a = shelter(1, 'う避難所', '1', { latitude: 0, longitude: 0 });
    const b = shelter(2, 'あ避難所', '3', { latitude: 0, longitude: 0 });
    const c = shelter(3, 'い避難所', '0', { latitude: 0, longitude: 0 });
    const d = shelter(4, 'あ避難所2', '1', { latitude: 0, longitude: 0 });
    const sorted = sortSheltersForList([b, c, a, d], null);
    expect(sorted.map((s) => s.id)).toEqual([4, 1, 2, 3]);
  });

  it('距離ありでも開設中が先。距離だけで閉鎖を上位にしない', () => {
    const distances = shelterDistances([near, mid, far], home);
    const sorted = sortSheltersForList([near, mid, far], distances);
    // near(閉鎖)が最も近いが、開設中の mid・far が先
    expect(sorted.map((s) => s.id)).toEqual([mid.id, far.id, near.id]);
  });

  it('同じ開設グループ内は自宅から近い順', () => {
    const openNear = shelter(10, '開設・近い', '2', { latitude: 33.746, longitude: 130.729 });
    const openFar = shelter(11, '開設・遠い', '1', { latitude: 33.79, longitude: 130.729 });
    const distances = shelterDistances([openFar, openNear], home);
    const sorted = sortSheltersForList([openFar, openNear], distances);
    // 混雑が重い '2' でも近ければ先(距離順が混雑順より優先)
    expect(sorted.map((s) => s.id)).toEqual([10, 11]);
  });

  it('元配列を破壊しない', () => {
    const input = [far, near];
    sortSheltersForList(input, null);
    expect(input.map((s) => s.id)).toEqual([far.id, near.id]);
  });
});

describe('nearestShelterFor', () => {
  const floodOnlyNear = shelter(
    1,
    '近い(水害のみ)',
    '0',
    { latitude: 33.745, longitude: 130.729 },
    { flood: true },
  );
  const bothMid = shelter(
    2,
    '中間(水害・地震)',
    '1',
    { latitude: 33.75, longitude: 130.729 },
    { flood: true, earthquake: true },
  );
  const quakeOnlyFar = shelter(
    3,
    '遠い(地震のみ)',
    '1',
    { latitude: 33.76, longitude: 130.729 },
    { earthquake: true },
  );
  const all = [quakeOnlyFar, bothMid, floodOnlyNear];

  it('指定の種別に対応する避難所の中で最も近いものを返す(開設の有無は問わない)', () => {
    expect(nearestShelterFor(all, home, 'flood')?.shelter.id).toBe(1);
    expect(nearestShelterFor(all, home, 'earthquake')?.shelter.id).toBe(2);
  });

  it('対応する避難所が無ければ null', () => {
    expect(nearestShelterFor(all, home, 'landslide')).toBeNull();
    expect(nearestShelterFor([], home, 'flood')).toBeNull();
  });

  it('距離は自宅からの直線距離(m)', () => {
    const meters = nearestShelterFor(all, home, 'flood')?.meters ?? 0;
    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(120);
  });
});

describe('nearestSheltersForHome', () => {
  it('自宅未設定は空', () => {
    expect(nearestSheltersForHome([near], null)).toEqual([]);
  });

  it('水害と地震で最寄りが違えば、水害、地震の順に2件', () => {
    const floodNear = shelter(
      1,
      '水害のみ',
      '0',
      { latitude: 33.745, longitude: 130.729 },
      { flood: true },
    );
    const quakeFar = shelter(
      2,
      '地震のみ',
      '0',
      { latitude: 33.75, longitude: 130.729 },
      { earthquake: true },
    );
    const entries = nearestSheltersForHome([quakeFar, floodNear], home);
    expect(entries.map((e) => [e.scope, e.shelter.id])).toEqual([
      ['flood', 1],
      ['earthquake', 2],
    ]);
  });

  it('同じ施設なら「水害・地震とも」の1件にまとめる', () => {
    const both = shelter(
      1,
      '両対応',
      '0',
      { latitude: 33.745, longitude: 130.729 },
      { flood: true, earthquake: true },
    );
    const farther = shelter(
      2,
      '遠い両対応',
      '0',
      { latitude: 33.75, longitude: 130.729 },
      { flood: true, earthquake: true },
    );
    const entries = nearestSheltersForHome([farther, both], home);
    expect(entries.map((e) => [e.scope, e.shelter.id])).toEqual([['both', 1]]);
  });

  it('id が重なる別の施設はまとめない(取り込みで OBJECTID を欠くと id が 0 で重なる)', () => {
    const floodA = shelter(
      0,
      '水害のみ',
      '0',
      { latitude: 33.745, longitude: 130.729 },
      { flood: true },
    );
    const quakeB = shelter(
      0,
      '地震のみ',
      '0',
      { latitude: 33.75, longitude: 130.729 },
      { earthquake: true },
    );
    const entries = nearestSheltersForHome([floodA, quakeB], home);
    expect(entries.map((e) => [e.scope, e.shelter.name])).toEqual([
      ['flood', '水害のみ'],
      ['earthquake', '地震のみ'],
    ]);
  });

  it('片方の種別に対応する避難所が無ければ、ある方だけ', () => {
    const floodOnly = shelter(
      1,
      '水害のみ',
      '0',
      { latitude: 33.745, longitude: 130.729 },
      { flood: true },
    );
    const entries = nearestSheltersForHome([floodOnly], home);
    expect(entries.map((e) => e.scope)).toEqual(['flood']);
  });
});
