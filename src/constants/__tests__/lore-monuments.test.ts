import {
  LORE_ATTRIBUTION,
  LORE_META,
  LORE_MONUMENTS,
  LORE_SOURCE,
} from '@/constants/lore-monuments';
import { expectInCity } from '@/test-utils/city-bounds';

describe('自然災害伝承碑のデータ', () => {
  it('直方市の2基(植木の記念碑、殿町の遠賀川改修記念碑)を持つ', () => {
    expect(LORE_MONUMENTS.map((m) => [m.id, m.name])).toEqual([
      ['40204-001', '記念碑'],
      ['40204-002', '遠賀川改修記念碑'],
    ]);
  });

  it('所在地が直方市で、座標が市域の中にある', () => {
    for (const m of LORE_MONUMENTS) {
      expect(m.address.startsWith('福岡県直方市')).toBe(true);
      expectInCity(m.coord);
    }
  });

  it('どちらも洪水の碑で、災害名、建立年(西暦)、伝承内容が入っている', () => {
    for (const m of LORE_MONUMENTS) {
      expect(m.disasterType).toBe('洪水');
      expect(m.disaster.length).toBeGreaterThan(0);
      // 全国分には「不明」の碑があり文字列で持つが、直方の2基は西暦が入っている
      expect(m.builtYear).toMatch(/^(18|19|20)\d{2}$/);
      expect(m.story.length).toBeGreaterThan(50);
    }
  });

  it('出典は版を含み、加工した旨を書く(国土地理院コンテンツ利用規約)', () => {
    expect(LORE_META.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(LORE_SOURCE).toContain('国土地理院');
    expect(LORE_SOURCE).toContain(LORE_META.version);
    expect(LORE_SOURCE).toContain('加工して作成');
    expect(LORE_ATTRIBUTION).toBe(`出典: ${LORE_SOURCE}`);
  });
});
