import { POPULATION_BUCKETS, POPULATION_CELLS, populationFill } from '@/constants/population-map';

describe('人口メッシュの静的データ', () => {
  it('市全体の合計が2025年推計(約54,900人)と一致する', () => {
    // 生成スクリプトの按分ロジックが変わって人数がずれたらここで検出する
    const total = POPULATION_CELLS.reduce((sum, c) => sum + c.pop, 0);
    expect(total).toBeGreaterThan(54000);
    expect(total).toBeLessThan(56000);
  });

  it('すべてのセルに地域名が付いている', () => {
    // 小地域境界との突合漏れ(市境の切れ端セル等)をここで検出する
    for (const c of POPULATION_CELLS) {
      expect(c.name).not.toBe('');
    }
  });

  it('65歳以上は各セルの総人口を超えない', () => {
    for (const c of POPULATION_CELLS) {
      expect(c.p65).toBeGreaterThanOrEqual(0);
      expect(c.p65).toBeLessThanOrEqual(c.pop);
    }
  });

  it('座標が直方市の範囲に収まっている', () => {
    // 生成時の緯度経度の取り違え・丸め誤りをここで検出する
    for (const c of POPULATION_CELLS) {
      for (const ring of c.polys) {
        for (const p of ring) {
          expect(p.latitude).toBeGreaterThan(33.65);
          expect(p.latitude).toBeLessThan(33.85);
          expect(p.longitude).toBeGreaterThan(130.6);
          expect(p.longitude).toBeLessThan(130.85);
        }
      }
    }
  });

  it('すべてのセルが描画できる外周(3点以上)を持つ', () => {
    for (const c of POPULATION_CELLS) {
      expect(c.polys.length).toBeGreaterThan(0);
      for (const ring of c.polys) {
        expect(ring.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('塗りの段階が人数に応じて濃くなる', () => {
    expect(populationFill(0)).toBe(POPULATION_BUCKETS[0].fill);
    expect(populationFill(99)).toBe(POPULATION_BUCKETS[0].fill);
    expect(populationFill(100)).toBe(POPULATION_BUCKETS[1].fill);
    expect(populationFill(500)).toBe(POPULATION_BUCKETS[2].fill);
    expect(populationFill(1000)).toBe(POPULATION_BUCKETS[3].fill);
    expect(populationFill(9999)).toBe(POPULATION_BUCKETS[3].fill);
  });
});
