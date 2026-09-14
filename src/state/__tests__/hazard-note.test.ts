import { hazardNoteKeys } from '@/state/plain-japanese';

describe('hazardNoteKeys', () => {
  it('対応しない種別ごとに1文(表示順)', () => {
    expect(
      hazardNoteKeys({ flood: true, landslide: false, earthquake: false, other: true }),
    ).toEqual(['shelterUnusableLandslide', 'shelterUnusableQuake']);
  });

  it('すべて対応する施設には何も添えない', () => {
    expect(hazardNoteKeys({ flood: true, landslide: true, earthquake: true, other: true })).toEqual(
      [],
    );
  });

  it('4種別すべて非対応(属性が空の記録)は「使えない」と言い切らず「情報がない」の1文', () => {
    expect(
      hazardNoteKeys({ flood: false, landslide: false, earthquake: false, other: false }),
    ).toEqual(['shelterHazardsUnknown']);
  });
});
