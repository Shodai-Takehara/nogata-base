import { SHELTER_MASTER } from '@/data/demo-master';
import { haversineMeters } from '@/utils/geo';
import { roadGapMeters, walkDistancesFrom } from '@/utils/walk-route';

const NOGATA_STATION = { latitude: 33.7448, longitude: 130.7263 };
/** 遠賀川の東岸(溝堀)。西岸の遠賀川水辺館は対岸に見えているが、橋まで回る */
const EAST_BANK = { latitude: 33.742, longitude: 130.7345 };
const TOKYO = { latitude: 35.68, longitude: 139.76 };

const byName = (name: string) => {
  const shelter = SHELTER_MASTER.find((s) => s.name === name);
  if (!shelter) throw new Error(`${name} がマスタに無い`);
  return shelter.coord;
};

describe('walkDistancesFrom', () => {
  it('直方駅から市内の全避難所へ道がつながっている', () => {
    const distances = walkDistancesFrom(
      NOGATA_STATION,
      SHELTER_MASTER.map((s) => s.coord),
    );
    expect(distances.every((d) => d != null && d > 0)).toBe(true);
  });

  it('道のりは直線より長く、隣の街区なら 2 倍以内(直方駅 → 直方市民体育センター)', () => {
    const target = byName('直方市民体育センター');
    const [road] = walkDistancesFrom(NOGATA_STATION, [target]);
    const straight = haversineMeters(NOGATA_STATION, target);
    expect(road).toBeGreaterThan(straight);
    expect(road).toBeLessThan(straight * 2);
  });

  it('川を挟むと橋を回るぶん直線の 2 倍を超える(東岸の溝堀 → 遠賀川水辺館)', () => {
    const target = byName('遠賀川水辺館');
    const [road] = walkDistancesFrom(EAST_BANK, [target]);
    const straight = haversineMeters(EAST_BANK, target);
    expect(road).toBeGreaterThan(straight * 2);
  });

  it('自宅と避難所が同じ位置なら道のりも 0 に近い', () => {
    const target = byName('直方市体育館');
    const [road] = walkDistancesFrom(target, [target]);
    expect(road).toBeLessThan(5);
  });

  it('グラフの外(東京)に自宅を置くと道に落とせず全部 null', () => {
    expect(walkDistancesFrom(TOKYO, [NOGATA_STATION, byName('直方市体育館')])).toEqual([
      null,
      null,
    ]);
  });

  it('全避難所が道から 150m 以内にある(敷地の広い学校でも道に落とせる)', () => {
    for (const s of SHELTER_MASTER) {
      const gap = roadGapMeters(s.coord);
      expect(gap).not.toBeNull();
      expect(gap as number).toBeLessThan(150);
    }
  });
});
