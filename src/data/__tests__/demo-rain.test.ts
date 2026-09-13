import { demoRainSource } from '@/data/demo-rain';
import { waterStatus } from '@/domain/status';

describe('デモモードの大雨シナリオ', () => {
  it('避難所が混雑3段階で開き、内訳の合計が人数と一致する', async () => {
    const shelters = await demoRainSource.fetchShelters();
    const open = shelters.filter((s) => s.opening !== '0');
    expect(new Set(open.map((s) => s.opening))).toEqual(new Set(['1', '2', '3']));
    for (const s of shelters) {
      const total = s.evacuees.reduce((sum, e) => sum + (e.male ?? 0) + (e.female ?? 0), 0);
      expect(total).toBe(s.refugees);
    }
  });

  it('地震に対応しない避難所も開いている(地震シナリオへ切り替えると閉じる様子が見える)', async () => {
    const shelters = await demoRainSource.fetchShelters();
    expect(shelters.some((s) => s.opening !== '0' && !s.hazards.earthquake)).toBe(true);
  });

  it('水位は危険、注意、平常が混在する(地震シナリオとの違い)', async () => {
    const levels = await demoRainSource.fetchWaterLevels();
    const statuses = new Set(levels.map((w) => waterStatus(w.levelCm, w.alertLevelCm)));
    expect(statuses).toEqual(new Set(['danger', 'caution', 'normal']));
  });
});
