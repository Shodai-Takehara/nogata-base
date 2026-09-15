import { OFFICIAL_SECTIONS } from '@/constants/official-links';
import { PLAIN_JAPANESE_COPY } from '@/state/plain-japanese-copy';

const links = OFFICIAL_SECTIONS.flatMap((s) => s.links);

describe('公式情報への導線', () => {
  it('URL は https、電話番号は数字だけ', () => {
    for (const link of links) {
      switch (link.target.kind) {
        case 'url':
          expect(link.target.url).toMatch(/^https:\/\//);
          break;
        case 'tel':
          expect(link.target.number).toMatch(/^\d+$/);
          break;
        case 'screen':
          // 型で固定している。ここでは URL と電話の形だけ見る
          break;
      }
    }
  });

  it('見出しと行の文言はすべて文言カタログにある', () => {
    for (const section of OFFICIAL_SECTIONS) {
      expect(PLAIN_JAPANESE_COPY[section.title]).toBeDefined();
      for (const link of section.links) {
        expect(PLAIN_JAPANESE_COPY[link.label]).toBeDefined();
        if (link.note) expect(PLAIN_JAPANESE_COPY[link.note]).toBeDefined();
      }
    }
  });

  it('区分と行のキーが重ならない(一覧の key に使う)', () => {
    const sectionKeys = OFFICIAL_SECTIONS.map((s) => s.key);
    expect(new Set(sectionKeys).size).toBe(sectionKeys.length);
    const keys = links.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('要件の入口が揃っている: 市、県、気象庁、川、電気、171、web171、00000JAPAN', () => {
    expect(links.map((l) => l.key)).toEqual([
      'city-emergency',
      'city-line',
      'pref-evacuation',
      'pref-app',
      'jma-warning',
      'river-level',
      'power-outage',
      'power-app',
      'dial-171',
      'web171',
      'disaster-wifi',
    ]);
  });
});
