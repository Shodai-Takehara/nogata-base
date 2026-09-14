import { SHELTER_MASTER, WATER_MASTER } from '@/data/demo-master';
import { sheltersWith, waterLevelsWith } from '@/data/demo-scenario';
import { waterStatus } from '@/domain/status';

describe('デモシナリオの共通の組み立て', () => {
  it('指定の無い施設は閉鎖として並び、全施設が一覧に出る', () => {
    const shelters = sheltersWith({});
    expect(shelters.map((s) => s.id)).toEqual(SHELTER_MASTER.map((m) => m.id));
    for (const s of shelters) {
      expect(s.opening).toBe('0');
      expect(s.families).toBe(0);
      expect(s.evacuees).toHaveLength(4);
    }
  });

  it('指定した施設は開設状況と内訳を持つ', () => {
    const [first] = SHELTER_MASTER;
    const shelters = sheltersWith({
      [first.id]: {
        opening: '2',
        families: 3,
        refugees: 8,
        breakdown: [1, 1, 1, 1, 1, 1, 1, 1],
        updatedMinutesAgo: 5,
      },
    });
    const shelter = shelters.find((s) => s.id === first.id);
    expect(shelter?.opening).toBe('2');
    expect(shelter?.refugees).toBe(8);
    expect(shelter?.evacuees.map((e) => e.bracket)).toEqual(['0-3', '3-18', '18-65', '65+']);
  });

  it('名指しの無い観測点は平常域になり、名指しした地点は比率どおりの水位になる', () => {
    const levels = waterLevelsWith({});
    expect(levels).toHaveLength(WATER_MASTER.length);
    for (const w of levels) {
      if (w.alertLevelCm != null) expect(waterStatus(w.levelCm, w.alertLevelCm)).toBe('normal');
    }
    const target = WATER_MASTER.find((m) => m.alertLevelCm != null);
    if (!target) throw new Error('警戒水位を持つ観測点がマスタに無い');
    const named = waterLevelsWith({ [target.name]: 1.2 }).find((w) => w.id === target.id);
    expect(waterStatus(named?.levelCm ?? null, named?.alertLevelCm ?? null)).toBe('danger');
  });
});
